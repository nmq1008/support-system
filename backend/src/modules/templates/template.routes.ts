import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { requireRole, ADMIN_ROLES } from '../../middleware/rbac';
import { query } from '../../config/db';
import { plainText } from '../../utils/sanitize';
import { notFound } from '../../utils/httpError';
import { AuthUser } from '../../types/express';

const router = Router();
router.use(authenticate);

/** A single template field definition (drag & drop builder output). */
const fieldSchema = z.object({
  key: z.string().min(1),
  type: z.enum([
    'text',
    'textarea',
    'select',
    'multiselect',
    'date',
    'file',
    'priority',
    'toggle',
    'section',
  ]),
  label: z.object({ vi: z.string(), en: z.string() }),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  tooltip: z.string().optional(),
  options: z
    .array(z.object({ value: z.string(), label: z.object({ vi: z.string(), en: z.string() }) }))
    .optional(),
});

const templateSchema = z.object({
  name: z.string().min(1),
  nameEn: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  category: z.string().optional(),
  orgId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  isGlobal: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  fieldsSchema: z.array(fieldSchema).default([]),
});

/** Templates visible for the given org/project context. */
function templateWhere(user: AuthUser, orgId?: string, projectId?: string) {
  const params: unknown[] = [];
  const parts: string[] = ['is_global = TRUE'];
  let i = 1;
  if (projectId) {
    params.push(projectId);
    parts.push(`project_id = $${i++}`);
  }
  if (orgId) {
    params.push(orgId);
    parts.push(`org_id = $${i++}`);
  } else if (user.orgId) {
    params.push(user.orgId);
    parts.push(`org_id = $${i++}`);
  }
  return { clause: `(${parts.join(' OR ')})`, params };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const w = templateWhere(req.user!, req.query.orgId as string, req.query.projectId as string);
    const { rows } = await query(
      `SELECT * FROM templates WHERE ${w.clause} ORDER BY is_default DESC, name`,
      w.params
    );
    res.json({ items: rows });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await query('SELECT * FROM templates WHERE id = $1', [req.params.id]);
    if (!rows[0]) throw notFound('Template không tồn tại');
    res.json(rows[0]);
  })
);

router.post(
  '/',
  requireRole(...ADMIN_ROLES),
  validateBody(templateSchema),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const { rows } = await query(
      `INSERT INTO templates(name, name_en, description, icon, category, org_id, project_id, is_global, is_default, fields_schema)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) RETURNING *`,
      [
        plainText(b.name),
        b.nameEn ? plainText(b.nameEn) : null,
        b.description || null,
        b.icon || null,
        b.category || null,
        b.orgId ?? null,
        b.projectId ?? null,
        b.isGlobal ?? false,
        b.isDefault ?? false,
        JSON.stringify(b.fieldsSchema),
      ]
    );
    res.status(201).json(rows[0]);
  })
);

router.put(
  '/:id',
  requireRole(...ADMIN_ROLES),
  validateBody(templateSchema.partial()),
  asyncHandler(async (req, res) => {
    const map: [string, string][] = [
      ['name', 'name'], ['nameEn', 'name_en'], ['description', 'description'], ['icon', 'icon'],
      ['category', 'category'], ['orgId', 'org_id'], ['projectId', 'project_id'],
      ['isGlobal', 'is_global'], ['isDefault', 'is_default'],
    ];
    const fields: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    for (const [k, col] of map) {
      if (req.body[k] !== undefined) {
        fields.push(`${col} = $${i++}`);
        params.push(req.body[k]);
      }
    }
    if (req.body.fieldsSchema !== undefined) {
      fields.push(`fields_schema = $${i++}::jsonb`);
      params.push(JSON.stringify(req.body.fieldsSchema));
    }
    if (!fields.length) return res.json({ ok: true });
    params.push(req.params.id);
    const { rows } = await query(`UPDATE templates SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, params);
    if (!rows[0]) throw notFound('Template không tồn tại');
    res.json(rows[0]);
  })
);

router.delete(
  '/:id',
  requireRole(...ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    await query('DELETE FROM templates WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  })
);

export default router;
