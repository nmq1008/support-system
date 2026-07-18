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

/** Update a stored SLA matrix cell (admin). */
router.patch(
  '/',
  requireRole(...ADMIN_ROLES),
  validateBody(
    z.object({
      priorityLevel: z.enum(['P1', 'P2', 'P3', 'P4', 'P5']),
      customerPriority: z.enum(['platinum', 'gold', 'silver', 'bronze']),
      responseHours: z.number().positive(),
      resolveHours: z.number().positive(),
    })
  ),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const { rows } = await query(
      `INSERT INTO sla_config(priority_level, customer_priority, response_hours, resolve_hours)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (priority_level, customer_priority)
       DO UPDATE SET response_hours = EXCLUDED.response_hours, resolve_hours = EXCLUDED.resolve_hours
       RETURNING *`,
      [b.priorityLevel, b.customerPriority, b.responseHours, b.resolveHours]
    );
    res.json(rows[0]);
  })
);

export default router;
