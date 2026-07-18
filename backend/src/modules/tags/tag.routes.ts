import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { query } from '../../config/db';
import { plainText } from '../../utils/sanitize';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { rows } = await query('SELECT * FROM tags ORDER BY name');
    res.json({ items: rows });
  })
);

router.post(
  '/',
  validateBody(z.object({ name: z.string().min(1).max(40), color: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `INSERT INTO tags(name, color) VALUES ($1,$2)
       ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color RETURNING *`,
      [plainText(req.body.name).toLowerCase(), req.body.color || '#2563EB']
    );
    res.status(201).json(rows[0]);
  })
);

export default router;
