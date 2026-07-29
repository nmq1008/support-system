import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { requireRole, ADMIN_ROLES } from '../../middleware/rbac';
import { query } from '../../config/db';
import { plainText } from '../../utils/sanitize';
import { PROJECT_PRIORITIES, TICKET_STATUSES } from '../../domain/types';
import { AuthUser } from '../../types/express';

const router = Router();
router.use(authenticate);

/** Projects the user can see. jira_token is never exposed to non-admins. */
function projectScope(user: AuthUser): { clause: string; params: unknown[] } {
  switch (user.role) {
    case 'super_admin':
      return { clause: 'TRUE', params: [] };
    case 'csm':
      return { clause: 'p.org_id = ANY($1)', params: [user.managedOrgIds.length ? user.managedOrgIds : ['00000000-0000-0000-0000-000000000000']] };
    case 'customer_admin':
      return { clause: 'p.org_id = $1', params: [user.orgId] };
    default:
      return {
        clause: `p.id IN (SELECT project_id FROM user_project_access WHERE user_id = $1)`,
        params: [user.id],
      };
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const s = projectScope(req.user!);
    const isAdmin = ADMIN_ROLES.includes(req.user!.role);
    const tokenCol = isAdmin ? 'p.jira_token' : `(CASE WHEN p.jira_token IS NOT NULL THEN '***' ELSE NULL END) AS jira_token`;
    const params = [...s.params];
    let extra = '';
    if (req.query.orgId) {
      params.push(req.query.orgId);
      extra = `AND p.org_id = $${params.length}`;
    }
    const { rows } = await query(
      `SELECT p.id, p.org_id, p.name, p.code, p.project_priority, p.jira_url, p.jira_key, ${tokenCol},
              p.board_columns, p.active, p.created_at,
              o.name AS org_name, o.customer_priority
       FROM projects p JOIN organizations o ON o.id = p.org_id
       WHERE ${s.clause} ${extra} ORDER BY p.name`,
      params
    );
    res.json({ items: rows });
  })
);

const projectSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1),
  code: z.string().min(1).max(20),
  projectPriority: z.enum(PROJECT_PRIORITIES as [string, ...string[]]).default('medium'),
  jiraUrl: z.string().url().optional(),
  jiraKey: z.string().optional(),
  jiraToken: z.string().optional(),
  active: z.boolean().optional(),
});

router.post(
  '/',
  requireRole(...ADMIN_ROLES),
  validateBody(projectSchema),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const { rows } = await query(
      `INSERT INTO projects(org_id, name, code, project_priority, jira_url, jira_key, jira_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [b.orgId, plainText(b.name), plainText(b.code).toUpperCase(), b.projectPriority, b.jiraUrl || null, b.jiraKey || null, b.jiraToken || null]
    );
    res.status(201).json(rows[0]);
  })
);

router.patch(
  '/:id',
  requireRole(...ADMIN_ROLES),
  validateBody(projectSchema.partial()),
  asyncHandler(async (req, res) => {
    const map: [string, string][] = [
      ['name', 'name'], ['code', 'code'], ['projectPriority', 'project_priority'],
      ['jiraUrl', 'jira_url'], ['jiraKey', 'jira_key'], ['jiraToken', 'jira_token'], ['active', 'active'],
    ];
    const fields: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    for (const [k, col] of map) {
      if (req.body[k] !== undefined) {
        fields.push(`${col} = $${i++}`);
        params.push(k === 'code' ? String(req.body[k]).toUpperCase() : req.body[k]);
      }
    }
    if (!fields.length) return res.json({ ok: true });
    params.push(req.params.id);
    const { rows } = await query(`UPDATE projects SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, params);
    res.json(rows[0]);
  })
);

/**
 * Self-service workflow setup: choose & order the Kanban board columns for a
 * project. Only valid ticket statuses are accepted; transitions still follow
 * the global state-machine.
 */
router.patch(
  '/:id/workflow',
  requireRole(...ADMIN_ROLES),
  validateBody(
    z.object({
      boardColumns: z
        .array(z.enum(TICKET_STATUSES as [string, ...string[]]))
        .min(2)
        .max(13),
    })
  ),
  asyncHandler(async (req, res) => {
    // de-duplicate while preserving order
    const cols = [...new Set(req.body.boardColumns)];
    const { rows } = await query(
      `UPDATE projects SET board_columns = $1::jsonb WHERE id = $2 RETURNING id, board_columns`,
      [JSON.stringify(cols), req.params.id]
    );
    res.json(rows[0]);
  })
);

export default router;
