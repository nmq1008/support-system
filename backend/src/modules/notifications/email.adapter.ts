import nodemailer, { Transporter } from 'nodemailer';
import { query } from '../../config/db';
import { env } from '../../config/env';
import { NotifyInput } from './notify.service';

/**
 * Email adapter. Sends via SMTP when SMTP_HOST is configured; otherwise falls
 * back to console logging (safe for dev / demo).
 *
 * Emails are localized to the RECIPIENT's language
 * (spec: "Email gửi theo ngôn ngữ của người nhận").
 */
let transporter: Transporter | null = null;
let initialized = false;

function getTransporter(): Transporter | null {
  if (initialized) return transporter;
  initialized = true;
  if (env.smtp.host) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
    // eslint-disable-next-line no-console
    console.log(`[email] SMTP enabled → ${env.smtp.host}:${env.smtp.port}`);
  } else {
    transporter = null;
    // eslint-disable-next-line no-console
    console.log('[email] SMTP not configured — emails will be logged only');
  }
  return transporter;
}

interface TicketMeta {
  code?: string;
  title?: string;
  status?: string;
  ticketId?: string | null;
}

export async function sendEmail(input: NotifyInput, meta: TicketMeta = {}): Promise<void> {
  const { rows } = await query<{
    email: string;
    name: string;
    language: string;
    notify_prefs: Record<string, boolean>;
  }>('SELECT email, name, language, notify_prefs FROM users WHERE id = $1', [input.userId]);
  const u = rows[0];
  if (!u) return;

  // Respect per-user opt-out.
  if (u.notify_prefs && u.notify_prefs[input.type] === false) return;

  const lang = u.language === 'en' ? 'en' : 'vi';
  const { subject, html, text } = renderEmail(input, meta, u.name, lang);

  const t = getTransporter();
  if (!t) {
    // eslint-disable-next-line no-console
    console.log(`[email→${u.email}] (${lang}) ${subject} :: ${text}`);
    return;
  }
  try {
    await t.sendMail({ from: env.smtp.from, to: u.email, subject, html, text });
    // eslint-disable-next-line no-console
    console.log(`[email→${u.email}] sent: ${subject}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[email→${u.email}] failed:`, (err as Error).message);
  }
}

const DONE_STATUSES = new Set(['resolved', 'complete', 'close']);

/** Build the localized subject + HTML/text body for a notification. */
function renderEmail(input: NotifyInput, meta: TicketMeta, name: string, lang: 'vi' | 'en') {
  const code = meta.code || '';
  const link = meta.ticketId ? `${env.appUrl}/tickets/${meta.ticketId}` : env.appUrl;
  const isDone = input.type === 'ticket_resolved' || (meta.status && DONE_STATUSES.has(meta.status));

  const L = {
    vi: {
      hello: `Xin chào ${name},`,
      resolvedSubject: `[HiDesk] Ticket ${code} đã được xử lý xong ✅`,
      resolvedBody: `Yêu cầu hỗ trợ của bạn đã được xử lý hoàn tất. Vui lòng kiểm tra và phản hồi nếu cần mở lại.`,
      genericSubject: subjectByType(input.type, 'vi', code),
      cta: 'Xem ticket',
      foot: 'Đây là email tự động từ hệ thống HiDesk. Vui lòng không trả lời email này.',
      titleLabel: 'Tiêu đề',
      statusLabel: 'Trạng thái',
    },
    en: {
      hello: `Hi ${name},`,
      resolvedSubject: `[HiDesk] Ticket ${code} has been resolved ✅`,
      resolvedBody: `Your support request has been completed. Please review and reopen it if anything is still needed.`,
      genericSubject: subjectByType(input.type, 'en', code),
      cta: 'View ticket',
      foot: 'This is an automated message from HiDesk. Please do not reply.',
      titleLabel: 'Title',
      statusLabel: 'Status',
    },
  }[lang];

  const subject = isDone ? L.resolvedSubject : L.genericSubject;
  const body = isDone ? L.resolvedBody : input.message;

  const rows = [
    meta.title ? `<tr><td style="color:#667085;padding:4px 12px 4px 0">${L.titleLabel}</td><td><b>${escapeHtml(meta.title)}</b></td></tr>` : '',
    meta.status ? `<tr><td style="color:#667085;padding:4px 12px 4px 0">${L.statusLabel}</td><td><b>${meta.status}</b></td></tr>` : '',
  ].join('');

  const html = `
  <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#131825">
    <div style="background:#2563EB;color:#fff;padding:18px 24px;border-radius:12px 12px 0 0;font-size:18px;font-weight:700">HiDesk</div>
    <div style="border:1px solid #EAECF0;border-top:none;border-radius:0 0 12px 12px;padding:24px">
      <p>${L.hello}</p>
      <p>${escapeHtml(body)}</p>
      <table style="font-size:14px;margin:12px 0">${rows}</table>
      <a href="${link}" style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">${L.cta} ${code}</a>
      <p style="color:#98A2B3;font-size:12px;margin-top:24px">${L.foot}</p>
    </div>
  </div>`;

  const text = `${L.hello}\n\n${body}\n${code} ${meta.title || ''}\n${link}\n\n${L.foot}`;
  return { subject, html, text };
}

function subjectByType(type: string, lang: 'vi' | 'en', code: string): string {
  const map: Record<string, { vi: string; en: string }> = {
    ticket_created: { vi: 'Ticket mới được tạo', en: 'New ticket created' },
    status_changed: { vi: 'Ticket đổi trạng thái', en: 'Ticket status changed' },
    assigned: { vi: 'Bạn được giao ticket', en: 'You were assigned a ticket' },
    sla_warning: { vi: 'Cảnh báo SLA', en: 'SLA warning' },
    comment: { vi: 'Bình luận mới', en: 'New comment' },
    mention: { vi: 'Bạn được nhắc đến', en: 'You were mentioned' },
    ticket_resolved: { vi: 'Ticket đã được xử lý xong', en: 'Ticket resolved' },
  };
  const e = map[type] || { vi: 'Thông báo', en: 'Notification' };
  return `[HiDesk] ${lang === 'en' ? e.en : e.vi}${code ? ` — ${code}` : ''}`;
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
