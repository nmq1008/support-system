import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { requireRole } from '../../middleware/rbac';
import { query } from '../../config/db';
import { plainText } from '../../utils/sanitize';
import { badRequest, forbidden, notFound } from '../../utils/httpError';
import { canViewTicket } from '../tickets/access';
import { notify } from '../notifications/notify.service';

const router = Router({ mergeParams: true });
router.use(authenticate);

/** Roles allowed to review/evaluate a dev's work (moderators / leads). */
const REVIEWER_ROLES = ['super_admin', 'csm', 'dev_lead', 'gate'] as const;
const DONE = ['resolved', 'complete', 'close'];

/** Submit a review of a dev's work on a done ticket. */
router.post(
  '/:ticketId/reviews',
  requireRole(...REVIEWER_ROLES),
  validateBody(
    z.object({
      devId: z.string().uuid(),
      rating: z.number().int().min(1).max(5),
      quality: z.number().int().min(1).max(5).optional(),
      timeliness: z.number().int().min(1).max(5).optional(),
      comment: z.string().max(2000).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const { rows } = await query<any>('SELECT * FROM tickets WHERE id = $1', [req.params.ticketId]);
    const ticket = rows[0];
    if (!ticket) throw notFound('Ticket không tồn tại');
    if (!canViewTicket(req.user!, ticket)) throw forbidden();
    if (!DONE.includes(ticket.status)) {
      throw badRequest('TICKET_NOT_DONE', 'Chỉ đánh giá ticket đã hoàn thành (Resolved/Complete/Close)');
    }

    const b = req.body;
    const result = await query(
      `INSERT INTO ticket_reviews(ticket_id, reviewer_id, dev_id, rating, quality, timeliness, comment)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (ticket_id, dev_id, reviewer_id)
       DO UPDATE SET rating = EXCLUDED.rating, quality = EXCLUDED.quality,
                     timeliness = EXCLUDED.timeliness, comment = EXCLUDED.comment, created_at = now()
       RETURNING *`,
      [ticket.id, req.user!.id, b.devId, b.rating, b.quality ?? null, b.timeliness ?? null, b.comment ? plainText(b.comment) : null]
    );

    // Let the dev know they were evaluated.
    await notify({
      userId: b.devId,
      ticketId: ticket.id,
      type: 'status_changed',
      title: 'Bạn nhận được đánh giá',
      message: `${ticket.code}: đánh giá ${b.rating}/5`,
    });
    res.status(201).json(result.rows[0]);
  })
);

export default router;
