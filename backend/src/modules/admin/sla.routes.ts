import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { requireRole, ADMIN_ROLES } from '../../middleware/rbac';
import { query } from '../../config/db';
import {
  BASE_SLA,
  CUSTOMER_FACTOR,
  PROJECT_FACTOR,
} from '../../domain/priority';
import { invalidateSlaCache } from './sla.service';

const router = Router();
router.use(authenticate);

/** Read SLA configuration (base + factors + stored per-tier rows). */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { rows } = await query('SELECT * FROM sla_config ORDER BY priority_level, customer_priority');
    res.json({
      base: BASE_SLA,
      customerFactor: CUSTOMER_FACTOR,
      projectFactor: PROJECT_FACTOR,
      matrix: rows,
    });
  })
);

const cellSchema = z.object({
  priorityLevel: z.enum(['P1', 'P2', 'P3', 'P4', 'P5']),
  customerPriority: z.enum(['platinum', 'gold', 'silver', 'bronze']),
  responseHours: z.number().positive().max(100000),
  resolveHours: z.number().positive().max(100000),
});

async function upsertCell(c: z.infer<typeof cellSchema>) {
  const { rows } = await query(
    `INSERT INTO sla_config(priority_level, customer_priority, response_hours, resolve_hours)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (priority_level, customer_priority)
     DO UPDATE SET response_hours = EXCLUDED.response_hours, resolve_hours = EXCLUDED.resolve_hours
     RETURNING *`,
    [c.priorityLevel, c.customerPriority, c.responseHours, c.resolveHours]
  );
  return rows[0];
}

/**
 * Update the stored SLA matrix (admin).
 * Accepts a single cell or `{ cells: [...] }` for a batch save.
 */
router.patch(
  '/',
  requireRole(...ADMIN_ROLES),
  validateBody(
    z.union([
      cellSchema,
      z.object({ cells: z.array(cellSchema).min(1).max(40) }),
    ])
  ),
  asyncHandler(async (req, res) => {
    const cells = 'cells' in req.body ? req.body.cells : [req.body];
    const saved = [];
    for (const c of cells) saved.push(await upsertCell(c));
    invalidateSlaCache();
    res.json({ items: saved });
  })
);

/** Reset the whole matrix back to base × customer-factor defaults (admin). */
router.post(
  '/reset',
  requireRole(...ADMIN_ROLES),
  asyncHandler(async (_req, res) => {
    for (const level of ['P1', 'P2', 'P3', 'P4', 'P5'] as const) {
      const base = BASE_SLA[level];
      for (const cp of ['platinum', 'gold', 'silver', 'bronze'] as const) {
        await upsertCell({
          priorityLevel: level,
          customerPriority: cp,
          responseHours: Math.round(base.responseHours * CUSTOMER_FACTOR[cp] * 100) / 100,
          resolveHours: Math.round(base.resolveHours * CUSTOMER_FACTOR[cp] * 100) / 100,
        });
      }
    }
    invalidateSlaCache();
    const { rows } = await query('SELECT * FROM sla_config ORDER BY priority_level, customer_priority');
    res.json({ items: rows });
  })
);

export default router;
