import { Router } from 'express';
import xl from 'excel4node';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { query } from '../../config/db';
import { AuthUser } from '../../types/express';
import { ticketScope } from '../tickets/access';

const router = Router();
router.use(authenticate);

async function fetchTickets(user: AuthUser, filters: Record<string, string | undefined>) {
  const scope = ticketScope(user, 1);
  const params: unknown[] = [...scope.params];
  const where: string[] = [scope.clause];
  let i = params.length + 1;
  for (const [key, col] of [
    ['status', 't.status'],
    ['priority', 't.priority_level'],
    ['projectId', 't.project_id'],
    ['orgId', 't.org_id'],
    ['ownerId', 't.owner_id'],
  ] as const) {
    if (filters[key]) {
      params.push(filters[key]);
      where.push(`${col} = $${i++}`);
    }
  }
  const { rows } = await query<any>(
    `SELECT t.code, t.title, t.status, t.priority_level, p.name AS project, o.name AS org,
            ow.name AS owner, cu.name AS customer, t.reopen_count,
            t.sla_resolve_deadline, t.resolved_at, t.created_at
     FROM tickets t
     JOIN projects p ON p.id = t.project_id
     JOIN organizations o ON o.id = t.org_id
     LEFT JOIN users ow ON ow.id = t.owner_id
     LEFT JOIN users cu ON cu.id = t.customer_id
     WHERE ${where.join(' AND ')} ORDER BY t.created_at DESC`,
    params
  );
  return rows;
}

/**
 * @openapi
 * /api/reports/tickets.xlsx:
 *   get: { tags: [Reports], summary: Xuất Excel danh sách ticket theo bộ lọc }
 */
router.get(
  '/tickets.xlsx',
  requireRole('super_admin', 'csm', 'dev_lead', 'dev', 'gate', 'customer_admin'),
  asyncHandler(async (req, res) => {
    const rows = await fetchTickets(req.user!, req.query as Record<string, string>);

    const wb = new xl.Workbook();
    const ws = wb.addWorksheet('Tickets');
    const header = wb.createStyle({ font: { bold: true, color: '#FFFFFF' }, fill: { type: 'pattern', patternType: 'solid', fgColor: '#2563EB' } });

    const cols = ['Code', 'Title', 'Status', 'Priority', 'Project', 'Org', 'Owner', 'Customer', 'Reopens', 'SLA Deadline', 'Resolved At', 'Created At'];
    cols.forEach((c, idx) => ws.cell(1, idx + 1).string(c).style(header));

    rows.forEach((r, ri) => {
      const row = ri + 2;
      ws.cell(row, 1).string(r.code || '');
      ws.cell(row, 2).string(r.title || '');
      ws.cell(row, 3).string(r.status || '');
      ws.cell(row, 4).string(r.priority_level || '');
      ws.cell(row, 5).string(r.project || '');
      ws.cell(row, 6).string(r.org || '');
      ws.cell(row, 7).string(r.owner || '');
      ws.cell(row, 8).string(r.customer || '');
      ws.cell(row, 9).number(r.reopen_count || 0);
      ws.cell(row, 10).string(r.sla_resolve_deadline ? new Date(r.sla_resolve_deadline).toISOString() : '');
      ws.cell(row, 11).string(r.resolved_at ? new Date(r.resolved_at).toISOString() : '');
      ws.cell(row, 12).string(r.created_at ? new Date(r.created_at).toISOString() : '');
    });
    [10, 40, 12, 8, 18, 18, 18, 18, 8, 22, 22, 22].forEach((w, idx) => ws.column(idx + 1).setWidth(w));

    res.setHeader('Content-Disposition', 'attachment; filename="hidesk-tickets.xlsx"');
    wb.write('hidesk-tickets.xlsx', res);
  })
);

/** SLA / reopen summary report (JSON) — for monthly/quarterly reporting. */
router.get(
  '/summary',
  requireRole('super_admin', 'csm', 'dev_lead', 'customer_admin'),
  asyncHandler(async (req, res) => {
    const scope = ticketScope(req.user!, 1);
    const { rows } = await query<any>(
      `SELECT p.name AS project,
              count(*)::int AS total,
              count(*) FILTER (WHERE t.status IN ('complete','resolved','close'))::int AS closed,
              count(*) FILTER (WHERE t.sla_resolve_deadline < COALESCE(t.resolved_at, now())
                                AND t.status NOT IN ('open'))::int AS sla_breached,
              count(*) FILTER (WHERE t.reopen_count > 0)::int AS reopened
       FROM tickets t JOIN projects p ON p.id = t.project_id
       WHERE ${scope.clause} GROUP BY p.name ORDER BY total DESC`,
      scope.params
    );
    res.json({ items: rows });
  })
);

export default router;
