import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { requireRole, ADMIN_ROLES } from '../../middleware/rbac';
import { query } from '../../config/db';
import { plainText } from '../../utils/sanitize';
import { CUSTOMER_PRIORITIES } from '../../domain/types';
import { AuthUser } from '../../types/express';

const router = Router();
router.use(authenticate);

/** Orgs visible to the user (scoped by role). */
function orgScope(user: AuthUser): { clause: string; params: unknown[] } {
  switch (user.role) {
    case 'super_admin':
      return { clause: 'TRUE', params: [] };
    case 'csm':
      return { clause: 'o.id = ANY($1)', params: [user.managedOrgIds.length ? user.managedOrgIds : ['00000000-0000-0000-0000-000000000000']] };
    case 'customer_admin':
    case 'customer':
      return { clause: 'o.id = $1', params: [user.orgId] };
    default:
      // staff see orgs of their assigned projects
      return {
        clause: `o.id IN (SELECT DISTINCT p.org_id FROM projects p
                          JOIN user_project_access upa ON upa.project_id = p.id
                          WHERE upa.user_id = $1)`,
        params: [user.id],
      };
  }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const s = orgScope(req.user!);
    const { rows } = await query(
      `SELECT o.*, (SELECT count(*)::int FROM projects p WHERE p.org_id = o.id) AS project_count
       FROM organizations o WHERE ${s.clause} ORDER BY o.name`,
      s.params
    );
    res.json({ items: rows });
  })
);

const orgSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).max(20),
  customerPriority: z.enum(CUSTOMER_PRIORITIES as [string, ...string[]]).default('silver'),
  logo: z.string().url().optional(),
});

router.post(
  '/',
  requireRole(...ADMIN_ROLES),
  validateBody(orgSchema),
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `INSERT INTO organizations(name, code, customer_priority, logo) VALUES ($1,$2,$3,$4) RETURNING *`,
      [plainText(req.body.name), plainText(req.body.code).toUpperCase(), req.body.customerPriority, req.body.logo || null]
    );
    res.status(201).json(rows[0]);
  })
);

router.patch(
  '/:id',
  requireRole(...ADMIN_ROLES),
  validateBody(orgSchema.partial()),
  asyncHandler(async (req, res) => {
    const fields: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    for (const [k, col] of [['name', 'name'], ['code', 'code'], ['customerPriority', 'customer_priority'], ['logo', 'logo']] as const) {
      if (req.body[k] !== undefined) {
        fields.push(`${col} = $${i++}`);
        params.push(k === 'code' ? String(req.body[k]).toUpperCase() : req.body[k]);
      }
    }
    if (!fields.length) return res.json({ ok: true });
    params.push(req.params.id);
    const { rows } = await query(`UPDATE organizations SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, params);
    res.json(rows[0]);
  })
);

export default router;
