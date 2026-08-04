import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { env } from '../../config/env';
import { query } from '../../config/db';
import { badRequest, forbidden, notFound } from '../../utils/httpError';
import { canViewTicket } from '../tickets/access';

const uploadDir = path.resolve(env.uploadDir);
fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'video/mp4',
  'video/webm',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) return cb(new Error('UNSUPPORTED_FILE_TYPE'));
    cb(null, true);
  },
});

const router = Router();
router.use(authenticate);

/** Upload an attachment to a ticket (ảnh, PDF, Excel, video ≤ 20MB). */
router.post(
  '/tickets/:ticketId/attachments',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('NO_FILE', 'Không có file được tải lên');
    const { rows } = await query<any>('SELECT * FROM tickets WHERE id = $1', [req.params.ticketId]);
    const ticket = rows[0];
    if (!ticket) throw notFound('Ticket không tồn tại');
    if (!canViewTicket(req.user!, ticket)) throw forbidden();

    const fileUrl = `/uploads/${req.file.filename}`;
    // Preserve the original (possibly Vietnamese-accented) filename for display.
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const result = await query(
      `INSERT INTO attachments(ticket_id, file_url, file_name, file_size, mime_type, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [ticket.id, fileUrl, originalName, req.file.size, req.file.mimetype, req.user!.id]
    );
    res.status(201).json(result.rows[0]);
  })
);

/** Delete an attachment (uploader or someone who can manage the ticket). Excel row 32. */
router.delete(
  '/attachments/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await query<any>(
      `SELECT a.*, t.owner_id, t.customer_id, t.project_id, t.org_id
       FROM attachments a JOIN tickets t ON t.id = a.ticket_id WHERE a.id = $1`,
      [req.params.id]
    );
    const att = rows[0];
    if (!att) throw notFound('Tệp không tồn tại');
    if (att.uploaded_by !== req.user!.id && !canViewTicket(req.user!, att)) throw forbidden();
    // remove file from disk (best-effort) + row
    try {
      const fp = path.join(uploadDir, path.basename(att.file_url));
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    } catch { /* ignore */ }
    await query('DELETE FROM attachments WHERE id = $1', [att.id]);
    res.json({ ok: true });
  })
);

export default router;
