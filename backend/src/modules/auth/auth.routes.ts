import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validateBody } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimit';
import { login } from './auth.service';
import { query } from '../../config/db';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng nhập, trả JWT + thông tin user
 */
router.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await login(email, password);
    res.json(result);
  })
);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Thông tin user hiện tại
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);

/** Update language preference (persisted to profile). */
router.patch(
  '/language',
  authenticate,
  validateBody(z.object({ language: z.enum(['vi', 'en']) })),
  asyncHandler(async (req, res) => {
    await query('UPDATE users SET language = $1 WHERE id = $2', [req.body.language, req.user!.id]);
    res.json({ ok: true, language: req.body.language });
  })
);

/** Update notification preferences. */
router.patch(
  '/notify-prefs',
  authenticate,
  validateBody(z.object({ prefs: z.record(z.boolean()) })),
  asyncHandler(async (req, res) => {
    await query('UPDATE users SET notify_prefs = $1::jsonb WHERE id = $2', [
      JSON.stringify(req.body.prefs),
      req.user!.id,
    ]);
    res.json({ ok: true });
  })
);

export default router;
