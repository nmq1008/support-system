import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { query } from '../../config/db';
import { forbidden, notFound } from '../../utils/httpError';
import { richText } from '../../utils/sanitize';
import { canManageTicket, canViewTicket } from '../tickets/access';
import { isStaff } from '../../middleware/rbac';
import { notify, notifyMany } from '../notifications/notify.service';

const router = Router({ mergeParams: true });
router.use(authenticate);

async function loadTicket(id: string) {
  const { rows } = await query<any>('SELECT * FROM tickets WHERE id = $1', [id]);
  if (!rows[0]) throw notFound('Ticket không tồn tại');
  return rows[0];
}

/** List comments for a ticket (internal hidden from customers). */
router.get(
  '/:ticketId/comments',
  asyncHandler(async (req, res) => {
    const ticket = await loadTicket(req.params.ticketId);
    if (!canViewTicket(req.user!, ticket)) throw forbidden();
    const internalFilter = isStaff(req.user!.role) ? '' : 'AND c.is_internal = FALSE';
    const { rows } = await query(
      `SELECT c.*, u.name AS user_name, u.avatar AS user_avatar
       FROM comments c LEFT JOIN users u ON u.id = c.user_id
       WHERE c.ticket_id = $1 ${internalFilter}
       ORDER BY c.created_at ASC`,
      [ticket.id]
    );
    res.json({ items: rows });
  })
);

const createSchema = z.object({
  content: z.string().min(1).max(20000),
  isInternal: z.boolean().optional(),
  mentions: z.array(z.string().uuid()).optional(),
});

/** Add a comment. Only staff can post internal comments. */
router.post(
  '/:ticketId/comments',
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const ticket = await loadTicket(req.params.ticketId);
    if (!canViewTicket(req.user!, ticket)) throw forbidden();

    const isInternal = !!req.body.isInternal && isStaff(req.user!.role);
    const mentions = req.body.mentions || [];

    const { rows } = await query(
      `INSERT INTO comments(ticket_id, user_id, content, is_internal, mentions)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [ticket.id, req.user!.id, richText(req.body.content), isInternal, mentions]
    );

    // @mention notifications
    if (mentions.length) {
      await notifyMany(mentions, {
        ticketId: ticket.id,
        type: 'mention',
        title: 'Bạn được nhắc đến',
        message: `${req.user!.name} mentioned you on ${ticket.code}`,
      });
    }
    // Notify the counterpart (owner ↔ customer) on public comments.
    if (!isInternal) {
      const counterpart = req.user!.id === ticket.customer_id ? ticket.owner_id : ticket.customer_id;
      if (counterpart && !mentions.includes(counterpart)) {
        await notify({
          userId: counterpart,
          ticketId: ticket.id,
          type: 'comment',
          title: 'Bình luận mới',
          message: `${ticket.code}: bình luận mới`,
        });
      }
    }

    res.status(201).json(rows[0]);
  })
);

/** Delete own comment (or staff who manages the ticket). */
router.delete(
  '/:ticketId/comments/:commentId',
  asyncHandler(async (req, res) => {
    const ticket = await loadTicket(req.params.ticketId);
    const { rows } = await query<any>('SELECT * FROM comments WHERE id = $1 AND ticket_id = $2', [
      req.params.commentId,
      ticket.id,
    ]);
    const comment = rows[0];
    if (!comment) throw notFound('Comment không tồn tại');
    if (comment.user_id !== req.user!.id && !canManageTicket(req.user!, ticket)) throw forbidden();
    await query('DELETE FROM comments WHERE id = $1', [comment.id]);
    res.json({ ok: true });
  })
);

export default router;
