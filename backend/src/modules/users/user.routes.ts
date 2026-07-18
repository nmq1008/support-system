import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { requireRole, ADMIN_ROLES } from '../../middleware/rbac';
import { query } from '../../config/db';
import { plainText } from '../../utils/sanitize';
import { ROLES } from '../../domain/types';
import { badRequest } from '../../utils/httpError';

const router = Router();
router.use(authenticate);

/** List assignable staff / users (for owner dropdowns & admin). */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const params: unknown[] = [];
    const where: string[] = ['active = TRUE'];
    let i = 1;
    if (req.query.role) {
      params.push(req.query.role);
      where.push(`role = $${i++}`);
    }
    if (req.query.staff === 'true') {
      where.push(`role IN ('super_admin','csm','dev_lead','dev','gate')`);
    }
    if (req.query.projectId) {
      params.push(req.query.projectId);
      where.push(`id IN (SELECT user_id FROM user_project_access WHERE project_id = $${i++})`);
    }
    const { rows } = await query(
      `SELECT id, name, email, role, org_id, language, avatar, active, created_at
       FROM users WHERE ${where.join(' AND ')} ORDER BY name`,
      params
    );
    res.json({ items: rows });
  })
);

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(ROLES as [string, ...string[]]),
  orgId: z.string().uuid().nullable().optional(),
  language: z.enum(['vi', 'en']).default('vi'),
  projectIds: z.array(z.string().uuid()).optional(),
  managedOrgIds: z.array(z.string().uuid()).optional(),
});

/** Create a user. Customer Admin may only create customers within their own org. */
router.post(
  '/',
  requireRole('super_admin', 'csm', 'customer_admin'),
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const b = req.body;
    if (req.user!.role === 'customer_admin') {
      if (b.role !== 'customer') throw badRequest('ROLE_FORBIDDEN', 'Customer Admin chỉ tạo được Customer');
      b.orgId = req.user!.orgId;
    }
    const hash = await bcrypt.hash(b.password, 10);
    const { rows } = await query(
      `INSERT INTO users(name, email, password_hash, role, org_id, language)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email, role, org_id, language, created_at`,
      [plainText(b.name), b.email.toLowerCase(), hash, b.role, b.orgId ?? null, b.language]
    );
    const user = rows[0];
    for (const pid of b.projectIds || []) {
      await query(`INSERT INTO user_project_access(user_id, project_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [user.id, pid]);
    }
    for (const oid of b.managedOrgIds || []) {
      await query(`INSERT INTO user_org_access(user_id, org_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [user.id, oid]);
    }
    res.status(201).json(user);
  })
);

/** Update role / project access (admins only). */
router.patch(
  '/:id/access',
  requireRole(...ADMIN_ROLES),
  validateBody(z.object({ projectIds: z.array(z.string().uuid()).optional(), managedOrgIds: z.array(z.string().uuid()).optional() })),
  asyncHandler(async (req, res) => {
    if (req.body.projectIds) {
      await query('DELETE FROM user_project_access WHERE user_id = $1', [req.params.id]);
      for (const pid of req.body.projectIds) {
        await query(`INSERT INTO user_project_access(user_id, project_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [req.params.id, pid]);
      }
    }
    if (req.body.managedOrgIds) {
      await query('DELETE FROM user_org_access WHERE user_id = $1', [req.params.id]);
      for (const oid of req.body.managedOrgIds) {
        await query(`INSERT INTO user_org_access(user_id, org_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [req.params.id, oid]);
      }
    }
    res.json({ ok: true });
  })
);

export default router;
