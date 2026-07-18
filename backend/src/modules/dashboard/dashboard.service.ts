import { query } from '../../config/db';
import { AuthUser } from '../../types/express';
import { ticketScope } from '../tickets/access';
import { STATUS_COLOR, OPEN_STATUSES } from '../../domain/status';
import { PRIORITY_COLOR } from '../../domain/priority';
import { PRIORITY_LEVELS } from '../../domain/types';
import { cacheGet, cacheSet } from '../../config/redis';

export interface DashboardFilters {
  orgId?: string;
  projectId?: string;
  ownerId?: string;
  priority?: string;
  from?: string; // ISO date
  to?: string;
}

/** Build the base scoped WHERE (visibility + filters). */
function buildWhere(user: AuthUser, f: DashboardFilters) {
  const scope = ticketScope(user, 1);
  const params: unknown[] = [...scope.params];
  const where: string[] = [scope.clause];
  let i = params.length + 1;
  if (f.orgId) {
    params.push(f.orgId);
    where.push(`t.org_id = $${i++}`);
  }
  if (f.projectId) {
    params.push(f.projectId);
    where.push(`t.project_id = $${i++}`);
  }
  if (f.ownerId) {
    params.push(f.ownerId);
    where.push(`t.owner_id = $${i++}`);
  }
  if (f.priority) {
    params.push(f.priority);
    where.push(`t.priority_level = $${i++}`);
  }
  return { clause: where.join(' AND '), params, nextIndex: i };
}

export async function getDashboard(user: AuthUser, f: DashboardFilters) {
  const cacheKey = `dashboard:${user.id}:${JSON.stringify(f)}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const base = buildWhere(user, f);
  const openList = OPEN_STATUSES.map((s) => `'${s}'`).join(',');

  // Date-range predicate for timeline / new-today widgets.
  const rangeParams = [...base.params];
  let ri = base.nextIndex;
  let rangeClause = base.clause;
  if (f.from) {
    rangeParams.push(f.from);
    rangeClause += ` AND t.created_at >= $${ri++}`;
  }
  if (f.to) {
    rangeParams.push(f.to);
    rangeClause += ` AND t.created_at <= $${ri++}`;
  }

  const [totals, byStatus, byPriority, byProject, workload, timeline, escalation, quick] = await Promise.all([
    // ── Summary widgets ──
    query<any>(
      `SELECT
         count(*)::int AS total,
         count(*) FILTER (WHERE t.status IN (${openList}))::int AS in_progress,
         count(*) FILTER (WHERE t.status = 'open')::int AS waiting_pickup,
         count(*) FILTER (WHERE t.status = 'waiting')::int AS waiting,
         count(*) FILTER (WHERE t.created_at::date = now()::date)::int AS new_today,
         count(*) FILTER (WHERE t.sla_resolve_deadline < now()
                           AND t.status NOT IN ('complete','resolved','close'))::int AS sla_breached,
         count(*) FILTER (WHERE t.reopen_count > 0)::int AS reopened,
         count(*) FILTER (WHERE t.status IN ('complete','resolved','close'))::int AS closed
       FROM tickets t WHERE ${base.clause}`,
      base.params
    ),
    query<any>(
      `SELECT t.status, count(*)::int AS count FROM tickets t WHERE ${base.clause} GROUP BY t.status`,
      base.params
    ),
    query<any>(
      `SELECT t.priority_level, count(*)::int AS count FROM tickets t WHERE ${base.clause} GROUP BY t.priority_level`,
      base.params
    ),
    query<any>(
      `SELECT p.name AS project, count(*)::int AS count
       FROM tickets t JOIN projects p ON p.id = t.project_id
       WHERE ${base.clause} GROUP BY p.name ORDER BY count DESC`,
      base.params
    ),
    // ── Owner workload (open tickets per staff) ──
    query<any>(
      `SELECT u.id, u.name,
              count(*) FILTER (WHERE t.status IN (${openList}))::int AS open_tickets,
              count(*) FILTER (WHERE t.priority_level IN ('P1','P2') AND t.status IN (${openList}))::int AS high_priority,
              count(*) FILTER (WHERE t.sla_resolve_deadline < now() AND t.status NOT IN ('complete','resolved','close'))::int AS breached
       FROM tickets t JOIN users u ON u.id = t.owner_id
       WHERE ${base.clause} GROUP BY u.id, u.name ORDER BY open_tickets DESC`,
      base.params
    ),
    // ── Timeline: created vs closed per day (last 14 days or range) ──
    query<any>(
      `WITH days AS (
         SELECT generate_series(
           COALESCE($${ri}::date, (now() - interval '13 days')::date),
           COALESCE($${ri + 1}::date, now()::date),
           interval '1 day')::date AS d
       )
       SELECT to_char(days.d,'YYYY-MM-DD') AS date,
         (SELECT count(*)::int FROM tickets t WHERE ${base.clause} AND t.created_at::date = days.d) AS created,
         (SELECT count(*)::int FROM tickets t WHERE ${base.clause} AND t.resolved_at::date = days.d) AS closed
       FROM days ORDER BY days.d`,
      [...base.params, f.from || null, f.to || null]
    ),
    // ── Escalation list: open P1/P2 sorted by SLA remaining ──
    query<any>(
      `SELECT t.id, t.code, t.title, t.priority_level, t.status, t.sla_resolve_deadline, t.escalated,
              p.name AS project_name, u.name AS owner_name,
              EXTRACT(EPOCH FROM (t.sla_resolve_deadline - now()))/3600 AS hours_left
       FROM tickets t JOIN projects p ON p.id = t.project_id
       LEFT JOIN users u ON u.id = t.owner_id
       WHERE ${base.clause} AND t.priority_level IN ('P1','P2')
         AND t.status NOT IN ('complete','resolved','close')
       ORDER BY t.sla_resolve_deadline ASC NULLS LAST LIMIT 20`,
      base.params
    ),
    // ── Quick tables ──
    Promise.all([
      // SLA about to breach (< 20% time left)
      query<any>(
        `SELECT t.id, t.code, t.title, t.priority_level, t.sla_resolve_deadline,
                EXTRACT(EPOCH FROM (t.sla_resolve_deadline - now()))/3600 AS hours_left
         FROM tickets t WHERE ${base.clause}
           AND t.status NOT IN ('complete','resolved','close')
           AND t.sla_resolve_deadline > now()
           AND (t.sla_resolve_deadline - now()) < 0.2 * (t.sla_resolve_deadline - t.created_at)
         ORDER BY t.sla_resolve_deadline ASC LIMIT 15`,
        base.params
      ),
      // Unowned > 2h
      query<any>(
        `SELECT t.id, t.code, t.title, t.created_at FROM tickets t
         WHERE ${base.clause} AND t.owner_id IS NULL AND t.created_at < now() - interval '2 hours'
           AND t.status NOT IN ('complete','resolved','close')
         ORDER BY t.created_at ASC LIMIT 15`,
        base.params
      ),
      // Waiting > 24h
      query<any>(
        `SELECT t.id, t.code, t.title, t.sla_paused_at FROM tickets t
         WHERE ${base.clause} AND t.status = 'waiting' AND t.sla_paused_at < now() - interval '24 hours'
         ORDER BY t.sla_paused_at ASC LIMIT 15`,
        base.params
      ),
    ]),
  ]);

  // SLA compliance gauge
  const summary = totals.rows[0];
  const totalConsidered = summary.total || 0;
  const compliance = totalConsidered
    ? Math.round(((totalConsidered - summary.sla_breached) / totalConsidered) * 100)
    : 100;
  const reopenRate = totalConsidered ? Math.round((summary.reopened / totalConsidered) * 100) : 0;

  const result = {
    summary: {
      total: summary.total,
      inProgress: summary.in_progress,
      waitingPickup: summary.waiting_pickup,
      waiting: summary.waiting,
      newToday: summary.new_today,
      slaBreached: summary.sla_breached,
      reopened: summary.reopened,
      closed: summary.closed,
      slaCompliance: compliance,
      reopenRate,
    },
    byStatus: byStatus.rows.map((r) => ({ status: r.status, count: r.count, color: STATUS_COLOR[r.status as keyof typeof STATUS_COLOR] })),
    byPriority: PRIORITY_LEVELS.map((lvl) => ({
      priority: lvl,
      count: byPriority.rows.find((r) => r.priority_level === lvl)?.count || 0,
      color: PRIORITY_COLOR[lvl],
    })),
    byProject: byProject.rows,
    workload: workload.rows,
    timeline: timeline.rows,
    escalation: escalation.rows,
    quick: {
      slaAtRisk: quick[0].rows,
      unowned: quick[1].rows,
      waitingStale: quick[2].rows,
    },
  };

  void rangeClause;
  void rangeParams;
  await cacheSet(cacheKey, result, 20);
  return result;
}
