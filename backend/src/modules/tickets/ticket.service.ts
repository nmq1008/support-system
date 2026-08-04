import { PoolClient } from 'pg';
import { pool, query, withTransaction } from '../../config/db';
import { badRequest, forbidden, notFound } from '../../utils/httpError';
import { plainText, richText } from '../../utils/sanitize';
import { AuthUser } from '../../types/express';
import { PageParams } from '../../utils/pagination';
import {
  isBreached,
  PRIORITY_COLOR,
  shouldEscalateImmediately,
  slaRemainingFraction,
} from '../../domain/priority';
import { computeConfiguredSla } from '../admin/sla.service';
import { STATUS_COLOR, assertTransition, CLOSED_STATUSES } from '../../domain/status';
import { CustomerPriority, PriorityLevel, ProjectPriority, TicketStatus } from '../../domain/types';
import { canManageTicket, canViewTicket, ticketScope } from './access';
import { nextTicketCode } from './code';
import { notify, notifyMany } from '../notifications/notify.service';
import { emitDashboard } from '../../realtime/io';
import { cacheInvalidate } from '../../config/redis';

interface TicketRow {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: TicketStatus;
  category: string | null;
  priority_level: PriorityLevel;
  template_id: string | null;
  org_id: string;
  project_id: string;
  owner_id: string | null;
  customer_id: string | null;
  sla_response_deadline: Date | null;
  sla_resolve_deadline: Date | null;
  sla_paused_at: Date | null;
  first_response_at: Date | null;
  resolved_at: Date | null;
  reopen_count: number;
  escalated: boolean;
  jira_issue_id: string | null;
  jira_issue_url: string | null;
  created_at: Date;
  updated_at: Date;
}

/** Enrich a raw ticket row with computed UI fields (colors, SLA state). */
export function serializeTicket(row: TicketRow & Record<string, unknown>) {
  const now = new Date();
  const resolveDeadline = row.sla_resolve_deadline ? new Date(row.sla_resolve_deadline) : null;
  const remaining = resolveDeadline
    ? slaRemainingFraction(resolveDeadline, new Date(row.created_at), now)
    : null;
  const isClosed = CLOSED_STATUSES.includes(row.status);
  return {
    ...row,
    statusColor: STATUS_COLOR[row.status],
    priorityColor: PRIORITY_COLOR[row.priority_level],
    sla: {
      responseDeadline: row.sla_response_deadline,
      resolveDeadline: row.sla_resolve_deadline,
      pausedAt: row.sla_paused_at,
      remainingFraction: remaining,
      breached: !isClosed && isBreached(resolveDeadline, now),
      atRisk: !isClosed && remaining !== null && remaining > 0 && remaining < 0.2,
    },
  };
}

export interface ListFilters {
  status?: string;
  priority?: string;
  projectId?: string;
  orgId?: string;
  ownerId?: string;
  templateId?: string;
  search?: string;
  tag?: string;
}

export async function listTickets(user: AuthUser, filters: ListFilters, page: PageParams) {
  const scope = ticketScope(user, 1);
  const params: unknown[] = [...scope.params];
  let i = params.length + 1;
  const where: string[] = [scope.clause];

  // status accepts a comma-separated list (status buckets — Excel row 5).
  if (filters.status) {
    const list = String(filters.status).split(',').filter(Boolean);
    params.push(list);
    where.push(`t.status = ANY($${i++})`);
  }
  if (filters.priority) {
    params.push(filters.priority);
    where.push(`t.priority_level = $${i++}`);
  }
  // projectId accepts a comma-separated list (multi-project filter — Excel row 30).
  if (filters.projectId) {
    const list = String(filters.projectId).split(',').filter(Boolean);
    params.push(list);
    where.push(`t.project_id = ANY($${i++})`);
  }
  if (filters.orgId) {
    params.push(filters.orgId);
    where.push(`t.org_id = $${i++}`);
  }
  if (filters.ownerId) {
    params.push(filters.ownerId);
    where.push(`t.owner_id = $${i++}`);
  }
  if (filters.templateId) {
    params.push(filters.templateId);
    where.push(`t.template_id = $${i++}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    where.push(`(t.title ILIKE $${i} OR t.description ILIKE $${i} OR t.code ILIKE $${i})`);
    i++;
  }
  if (filters.tag) {
    params.push(filters.tag);
    where.push(`EXISTS (SELECT 1 FROM ticket_tags tt JOIN tags g ON g.id = tt.tag_id
                        WHERE tt.ticket_id = t.id AND g.name = $${i++})`);
  }

  const whereSql = where.join(' AND ');
  const countRes = await query<{ count: string }>(
    `SELECT count(*)::int AS count FROM tickets t WHERE ${whereSql}`,
    params
  );
  const total = Number(countRes.rows[0].count);

  params.push(page.pageSize, page.offset);
  const rows = await query<TicketRow>(
    `SELECT t.*, p.name AS project_name, p.project_priority, o.name AS org_name,
            o.customer_priority, ow.name AS owner_name, cu.name AS customer_name,
            COALESCE((SELECT json_agg(json_build_object('id', u.id, 'name', u.name))
                      FROM ticket_assignees ta JOIN users u ON u.id = ta.user_id
                      WHERE ta.ticket_id = t.id), '[]') AS assignees,
            COALESCE((SELECT json_agg(json_build_object('id', g.id, 'name', g.name, 'color', g.color))
                      FROM ticket_tags tt JOIN tags g ON g.id = tt.tag_id
                      WHERE tt.ticket_id = t.id), '[]') AS tags
     FROM tickets t
     JOIN projects p ON p.id = t.project_id
     JOIN organizations o ON o.id = t.org_id
     LEFT JOIN users ow ON ow.id = t.owner_id
     LEFT JOIN users cu ON cu.id = t.customer_id
     WHERE ${whereSql}
     ORDER BY t.created_at DESC
     LIMIT $${i++} OFFSET $${i++}`,
    params
  );
  return { items: rows.rows.map((r) => serializeTicket(r as any)), total };
}

async function loadRow(id: string): Promise<TicketRow | null> {
  const { rows } = await query<TicketRow>('SELECT * FROM tickets WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function getTicketDetail(user: AuthUser, id: string) {
  const base = await loadRow(id);
  if (!base) throw notFound('Ticket không tồn tại');
  if (!canViewTicket(user, base)) throw forbidden('Bạn không có quyền xem ticket này');

  const [enriched, fields, comments, history, tags, attachments, assignees, reviews] = await Promise.all([
    query<TicketRow>(
      `SELECT t.*, p.name AS project_name, p.code AS project_code, p.project_priority, p.jira_url, p.jira_key,
              o.name AS org_name, o.customer_priority, ow.name AS owner_name, cu.name AS customer_name
       FROM tickets t
       JOIN projects p ON p.id = t.project_id
       JOIN organizations o ON o.id = t.org_id
       LEFT JOIN users ow ON ow.id = t.owner_id
       LEFT JOIN users cu ON cu.id = t.customer_id
       WHERE t.id = $1`,
      [id]
    ),
    query('SELECT field_key, field_value FROM ticket_fields WHERE ticket_id = $1', [id]),
    // Customers never see internal comments.
    query(
      `SELECT c.*, u.name AS user_name, u.avatar AS user_avatar
       FROM comments c LEFT JOIN users u ON u.id = c.user_id
       WHERE c.ticket_id = $1 ${user.role === 'customer' || user.role === 'customer_admin' ? 'AND c.is_internal = FALSE' : ''}
       ORDER BY c.created_at ASC`,
      [id]
    ),
    query(
      `SELECT h.*, u.name AS changed_by_name FROM ticket_history h
       LEFT JOIN users u ON u.id = h.changed_by
       WHERE h.ticket_id = $1 ORDER BY h.changed_at DESC`,
      [id]
    ),
    query(
      `SELECT g.id, g.name, g.color FROM ticket_tags tt JOIN tags g ON g.id = tt.tag_id
       WHERE tt.ticket_id = $1`,
      [id]
    ),
    query('SELECT * FROM attachments WHERE ticket_id = $1 ORDER BY created_at ASC', [id]),
    query(
      `SELECT u.id, u.name FROM ticket_assignees ta JOIN users u ON u.id = ta.user_id
       WHERE ta.ticket_id = $1 ORDER BY u.name`,
      [id]
    ),
    query(
      `SELECT r.*, rv.name AS reviewer_name, dv.name AS dev_name FROM ticket_reviews r
       LEFT JOIN users rv ON rv.id = r.reviewer_id
       LEFT JOIN users dv ON dv.id = r.dev_id
       WHERE r.ticket_id = $1 ORDER BY r.created_at DESC`,
      [id]
    ),
  ]);

  // Attach comment-level media to their comments.
  const commentAttachments = attachments.rows.filter((a: any) => a.comment_id);
  const commentRows = comments.rows.map((c: any) => ({
    ...c,
    attachments: commentAttachments.filter((a: any) => a.comment_id === c.id),
  }));

  return {
    ...serializeTicket(enriched.rows[0] as any),
    fields: fields.rows,
    comments: commentRows,
    history: history.rows,
    tags: tags.rows,
    attachments: attachments.rows.filter((a: any) => !a.comment_id),
    assignees: assignees.rows,
    reviews: reviews.rows,
  };
}

export interface CreateTicketInput {
  title: string;
  description?: string;
  templateId?: string | null;
  projectId: string;
  priorityLevel?: PriorityLevel;
  category?: string;
  customerId?: string | null;
  fields?: { key: string; value: string }[];
  tagIds?: string[];
}

/** Look up org customer_priority + project priority to compute SLA. */
async function loadPriorityContext(
  client: PoolClient,
  projectId: string
): Promise<{ orgId: string; customerPriority: CustomerPriority; projectPriority: ProjectPriority }> {
  const { rows } = await client.query(
    `SELECT p.org_id, p.project_priority, o.customer_priority
     FROM projects p JOIN organizations o ON o.id = p.org_id WHERE p.id = $1`,
    [projectId]
  );
  if (!rows[0]) throw badRequest('PROJECT_NOT_FOUND', 'Project không tồn tại');
  return {
    orgId: rows[0].org_id,
    customerPriority: rows[0].customer_priority,
    projectPriority: rows[0].project_priority,
  };
}

export async function createTicket(user: AuthUser, input: CreateTicketInput) {
  const title = plainText(input.title);
  if (!title) throw badRequest('TITLE_REQUIRED', 'Tiêu đề không được để trống');

  // Customers may only create in projects they have access to.
  if (user.role === 'customer' && !user.projectIds.includes(input.projectId)) {
    throw forbidden('Bạn không được phép tạo ticket trong project này');
  }

  const level: PriorityLevel = input.priorityLevel || 'P3';

  const created = await withTransaction(async (c) => {
    const ctx = await loadPriorityContext(c, input.projectId);
    const sla = await computeConfiguredSla(level, ctx.customerPriority, ctx.projectPriority);
    const escalate = shouldEscalateImmediately(ctx.customerPriority, level);
    const code = await nextTicketCode(c);
    const customerId = user.role === 'customer' ? user.id : input.customerId ?? null;

    const { rows } = await c.query<TicketRow>(
      `INSERT INTO tickets(code, title, description, status, category, priority_level, template_id,
         org_id, project_id, customer_id, escalated, sla_response_deadline, sla_resolve_deadline)
       VALUES ($1,$2,$3,'open',$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        code,
        title,
        input.description ? richText(input.description) : null,
        input.category ? plainText(input.category) : null,
        level,
        input.templateId ?? null,
        ctx.orgId,
        input.projectId,
        customerId,
        escalate,
        sla.responseDeadline,
        sla.resolveDeadline,
      ]
    );
    const ticket = rows[0];

    // Template field values
    for (const f of input.fields || []) {
      await c.query(
        `INSERT INTO ticket_fields(ticket_id, field_key, field_value) VALUES ($1,$2,$3)
         ON CONFLICT (ticket_id, field_key) DO UPDATE SET field_value = EXCLUDED.field_value`,
        [ticket.id, plainText(f.key), f.value == null ? null : String(f.value).slice(0, 5000)]
      );
    }
    for (const tagId of input.tagIds || []) {
      await c.query(`INSERT INTO ticket_tags(ticket_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [
        ticket.id,
        tagId,
      ]);
    }

    await c.query(
      `INSERT INTO ticket_history(ticket_id, changed_by, action, old_status, new_status, note)
       VALUES ($1,$2,'create',NULL,'open',$3)`,
      [ticket.id, user.id, escalate ? 'Escalated to Dev Lead (Platinum)' : 'Ticket created']
    );
    return { ticket, ctx, escalate };
  });

  // Notify gate + escalate to dev leads (outside transaction).
  await notifyProjectStaff(created.ticket, created.escalate);
  emitDashboard('ticket:changed', { id: created.ticket.id });
  await cacheInvalidate('dashboard:*');
  return serializeTicket(created.ticket as any);
}

async function notifyProjectStaff(ticket: TicketRow, escalate: boolean) {
  const gates = await query<{ user_id: string }>(
    `SELECT upa.user_id FROM user_project_access upa
     JOIN users u ON u.id = upa.user_id
     WHERE upa.project_id = $1 AND u.role IN ('gate','csm','dev_lead')`,
    [ticket.project_id]
  );
  await notifyMany(
    gates.rows.map((r) => r.user_id),
    {
      ticketId: ticket.id,
      type: escalate ? 'sla_warning' : 'ticket_created',
      title: escalate ? 'Escalation (Platinum)' : 'Ticket mới',
      message: `${ticket.code}: ${ticket.title}`,
    }
  );
}

export interface UpdateTicketInput {
  title?: string;
  description?: string;
  priorityLevel?: PriorityLevel;
  ownerId?: string | null;
  category?: string;
  tagIds?: string[];
}

export async function updateTicket(user: AuthUser, id: string, input: UpdateTicketInput) {
  const row = await loadRow(id);
  if (!row) throw notFound('Ticket không tồn tại');
  if (!canManageTicket(user, row)) throw forbidden('Bạn không có quyền sửa ticket này');
  // Customers cannot reassign / reprioritise.
  if (user.role === 'customer' && (input.ownerId !== undefined || input.priorityLevel !== undefined)) {
    throw forbidden('Khách hàng không thể đổi owner hoặc priority');
  }

  await withTransaction(async (c) => {
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    const audit: { field: string; oldVal: unknown; newVal: unknown }[] = [];

    if (input.title !== undefined) {
      const v = plainText(input.title);
      sets.push(`title = $${i++}`);
      params.push(v);
      audit.push({ field: 'title', oldVal: row.title, newVal: v });
    }
    if (input.description !== undefined) {
      const v = richText(input.description);
      sets.push(`description = $${i++}`);
      params.push(v);
      audit.push({ field: 'description', oldVal: '(changed)', newVal: '(changed)' });
    }
    if (input.category !== undefined) {
      sets.push(`category = $${i++}`);
      params.push(plainText(input.category));
    }
    if (input.priorityLevel !== undefined && input.priorityLevel !== row.priority_level) {
      // recompute SLA on priority change
      const ctx = await loadPriorityContext(c, row.project_id);
      const sla = await computeConfiguredSla(input.priorityLevel, ctx.customerPriority, ctx.projectPriority, new Date(row.created_at));
      sets.push(`priority_level = $${i++}`, `sla_response_deadline = $${i++}`, `sla_resolve_deadline = $${i++}`);
      params.push(input.priorityLevel, sla.responseDeadline, sla.resolveDeadline);
      audit.push({ field: 'priority_level', oldVal: row.priority_level, newVal: input.priorityLevel });
    }
    if (input.ownerId !== undefined) {
      sets.push(`owner_id = $${i++}`);
      params.push(input.ownerId);
      // Audit with human names, not raw ids (Excel row 35).
      const nameOf = async (uid: string | null) =>
        uid ? (await c.query<{ name: string }>('SELECT name FROM users WHERE id = $1', [uid])).rows[0]?.name || '—' : '(chưa giao)';
      audit.push({ field: 'owner', oldVal: await nameOf(row.owner_id), newVal: await nameOf(input.ownerId) });
    }

    if (sets.length) {
      params.push(id);
      await c.query(`UPDATE tickets SET ${sets.join(', ')} WHERE id = $${i}`, params);
    }

    if (input.tagIds) {
      await c.query('DELETE FROM ticket_tags WHERE ticket_id = $1', [id]);
      for (const tagId of input.tagIds) {
        await c.query(`INSERT INTO ticket_tags(ticket_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [
          id,
          tagId,
        ]);
      }
    }

    for (const a of audit) {
      await c.query(
        `INSERT INTO ticket_history(ticket_id, changed_by, action, field, old_value, new_value)
         VALUES ($1,$2,'update',$3,$4,$5)`,
        [id, user.id, a.field, String(a.oldVal ?? ''), String(a.newVal ?? '')]
      );
    }
  });

  // Notify newly assigned owner
  if (input.ownerId && input.ownerId !== row.owner_id) {
    await notify({
      userId: input.ownerId,
      ticketId: id,
      type: 'assigned',
      title: 'Bạn được giao ticket',
      message: `${row.code}: ${row.title}`,
    });
  }
  emitDashboard('ticket:changed', { id });
  await cacheInvalidate('dashboard:*');
  return getTicketDetail(user, id);
}

export interface StatusChangeInput {
  status: TicketStatus;
  note?: string;
  meta?: Record<string, unknown>;
}

export async function changeStatus(user: AuthUser, id: string, input: StatusChangeInput) {
  const row = await loadRow(id);
  if (!row) throw notFound('Ticket không tồn tại');
  if (!canManageTicket(user, row)) throw forbidden('Bạn không có quyền đổi trạng thái ticket này');

  // Customers participate only in the REVIEW/evaluation step of the workflow:
  // họ có thể Đóng (xác nhận đạt) hoặc Mở lại (đánh giá chưa đạt) ticket của mình,
  // không được điều khiển các bước xử lý nội bộ (build/testing/deploy…).
  if (user.role === 'customer' && !['close', 'reopen'].includes(input.status)) {
    throw forbidden('Khách hàng chỉ có thể Đóng (xác nhận) hoặc Mở lại (đánh giá) ticket');
  }

  // Validates transition legality + mandatory meta (Waiting/On Hold/Reopen/Deploy).
  assertTransition({ from: row.status, to: input.status, meta: input.meta });

  await withTransaction(async (c) => {
    const now = new Date();
    const sets: string[] = ['status = $1'];
    const params: unknown[] = [input.status];
    let i = 2;

    // SLA pause/resume for Waiting & On Hold.
    if ((input.status === 'waiting' || input.status === 'on_hold') && !row.sla_paused_at) {
      sets.push(`sla_paused_at = $${i++}`);
      params.push(now);
    } else if (row.sla_paused_at && input.status !== 'waiting' && input.status !== 'on_hold') {
      // resume: push deadlines forward by the paused duration
      const pausedMs = now.getTime() - new Date(row.sla_paused_at).getTime();
      sets.push(
        `sla_paused_at = NULL`,
        `sla_response_deadline = sla_response_deadline + ($${i} * interval '1 millisecond')`,
        `sla_resolve_deadline = sla_resolve_deadline + ($${i} * interval '1 millisecond')`
      );
      params.push(pausedMs);
      i++;
    }

    if (['complete', 'resolved', 'close'].includes(input.status) && !row.resolved_at) {
      sets.push(`resolved_at = $${i++}`);
      params.push(now);
    }
    if (input.status === 'reopen') {
      // Reopen resets the SLA clock — recompute deadlines from now (Excel row 39).
      const ctx = await loadPriorityContext(c, row.project_id);
      const sla = await computeConfiguredSla(row.priority_level, ctx.customerPriority, ctx.projectPriority, now);
      sets.push(
        `reopen_count = reopen_count + 1`,
        `resolved_at = NULL`,
        `sla_paused_at = NULL`,
        `sla_response_deadline = $${i++}`,
        `sla_resolve_deadline = $${i++}`
      );
      params.push(sla.responseDeadline, sla.resolveDeadline);
    }
    if (input.status === 'in_progress' && !row.first_response_at) {
      sets.push(`first_response_at = $${i++}`);
      params.push(now);
    }

    params.push(id);
    await c.query(`UPDATE tickets SET ${sets.join(', ')} WHERE id = $${i}`, params);

    await c.query(
      `INSERT INTO ticket_history(ticket_id, changed_by, action, old_status, new_status, note, meta)
       VALUES ($1,$2,'status',$3,$4,$5,$6::jsonb)`,
      [id, user.id, row.status, input.status, input.note ? plainText(input.note) : null, JSON.stringify(input.meta || {})]
    );
  });

  // When the ticket is marked done → send the customer a dedicated
  // "resolved" email; otherwise a generic status-change notification.
  const isDone = ['resolved', 'complete', 'close'].includes(input.status);
  const emailMeta = { code: row.code, title: row.title, status: input.status };

  if (isDone && row.customer_id) {
    await notify({
      userId: row.customer_id,
      ticketId: id,
      type: 'ticket_resolved',
      title: 'Ticket đã được xử lý xong',
      message: `${row.code}: ${row.title} đã được xử lý xong (${input.status})`,
      emailMeta,
    });
  }
  // Owner (and customer for non-done changes) get a status-change notice.
  const others = [row.owner_id, isDone ? null : row.customer_id].filter(Boolean) as string[];
  await notifyMany(others, {
    ticketId: id,
    type: 'status_changed',
    title: 'Ticket đổi trạng thái',
    message: `${row.code} → ${input.status}`,
    emailMeta,
  });
  emitDashboard('ticket:changed', { id });
  await cacheInvalidate('dashboard:*');
  return getTicketDetail(user, id);
}

/** Set the collaborating dev assignees for a ticket (staff only). Notifies newly added. */
export async function setAssignees(user: AuthUser, id: string, userIds: string[]) {
  const row = await loadRow(id);
  if (!row) throw notFound('Ticket không tồn tại');
  if (!canManageTicket(user, row)) throw forbidden('Bạn không có quyền gán người xử lý');

  const existing = await query<{ user_id: string }>('SELECT user_id FROM ticket_assignees WHERE ticket_id = $1', [id]);
  const before = new Set(existing.rows.map((r) => r.user_id));
  const after = new Set(userIds);

  // Resolve names for a readable audit entry (Excel row 36).
  const names = userIds.length
    ? (await query<{ name: string }>('SELECT name FROM users WHERE id = ANY($1) ORDER BY name', [userIds])).rows
        .map((r) => r.name)
        .join(', ')
    : '(không có)';

  await withTransaction(async (c) => {
    await c.query('DELETE FROM ticket_assignees WHERE ticket_id = $1', [id]);
    for (const uid of userIds) {
      await c.query('INSERT INTO ticket_assignees(ticket_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [id, uid]);
    }
    await c.query(
      `INSERT INTO ticket_history(ticket_id, changed_by, action, field, new_value, note)
       VALUES ($1,$2,'assignees','assignees',$3,$4)`,
      [id, user.id, names, `Người xử lý: ${names}`]
    );
  });

  // Notify newly added assignees.
  const added = userIds.filter((u) => !before.has(u));
  await notifyMany(added, {
    ticketId: id,
    type: 'assigned',
    title: 'Bạn được thêm vào ticket',
    message: `${row.code}: ${row.title}`,
    emailMeta: { code: row.code, title: row.title },
  });
  void after;
  emitDashboard('ticket:changed', { id });
  return getTicketDetail(user, id);
}

/** Duplicate detection: warn if a similar title already exists in the project. */
export async function findDuplicates(user: AuthUser, projectId: string, title: string) {
  const scope = ticketScope(user, 2);
  const { rows } = await query(
    `SELECT t.id, t.code, t.title, t.status, similarity(t.title, $1) AS score
     FROM tickets t
     WHERE t.project_id = $${2 + scope.params.length}
       AND ${scope.clause}
       AND similarity(t.title, $1) > 0.3
     ORDER BY score DESC LIMIT 5`,
    [plainText(title), ...scope.params, projectId]
  );
  return rows;
}

/** Bulk action: change status / assign / priority for many tickets at once. */
export async function bulkAction(
  user: AuthUser,
  ticketIds: string[],
  action: { status?: TicketStatus; ownerId?: string | null; priorityLevel?: PriorityLevel }
) {
  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const id of ticketIds) {
    try {
      if (action.status) await changeStatus(user, id, { status: action.status });
      if (action.ownerId !== undefined || action.priorityLevel !== undefined) {
        await updateTicket(user, id, { ownerId: action.ownerId, priorityLevel: action.priorityLevel });
      }
      results.push({ id, ok: true });
    } catch (err) {
      results.push({ id, ok: false, error: (err as Error).message });
    }
  }
  return results;
}

export { pool };
