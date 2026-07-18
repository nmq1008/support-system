import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { query } from '../../config/db';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const unreadOnly = req.query.unread === 'true';
    const { rows } = await query(
      `SELECT n.*, t.code AS ticket_code FROM notifications n
       LEFT JOIN tickets t ON t.id = n.ticket_id
       WHERE n.user_id = $1 ${unreadOnly ? 'AND n.is_read = FALSE' : ''}
       ORDER BY n.created_at DESC LIMIT 50`,
      [req.user!.id]
    );
    const unread = await query<{ c: string }>(
      'SELECT count(*)::int AS c FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [req.user!.id]
    );
    res.json({ items: rows, unreadCount: Number(unread.rows[0].c) });
  })
);

router.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    await query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user!.id,
    ]);
    res.json({ ok: true });
  })
);

router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user!.id]);
    res.json({ ok: true });
  })
);

export default router;
