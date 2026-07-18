import { query } from '../../config/db';
import { NotifyInput } from './notify.service';

/**
 * Pluggable email adapter. In production wire this to SMTP / SendGrid / SES.
 * Emails are sent in the RECIPIENT's language (spec: "Email gửi theo ngôn ngữ
 * của người nhận"). By default we only log — no external calls in dev.
 */
export async function sendEmail(input: NotifyInput): Promise<void> {
  const { rows } = await query<{ email: string; language: string; notify_prefs: Record<string, boolean> }>(
    'SELECT email, language, notify_prefs FROM users WHERE id = $1',
    [input.userId]
  );
  const u = rows[0];
  if (!u) return;

  // Respect per-user opt-out.
  if (u.notify_prefs && u.notify_prefs[input.type] === false) return;

  const subject = localizeSubject(input.type, u.language);
  // eslint-disable-next-line no-console
  console.log(`[email→${u.email}] (${u.language}) ${subject}: ${input.message}`);
}

function localizeSubject(type: string, lang: string): string {
  const map: Record<string, { vi: string; en: string }> = {
    ticket_created: { vi: 'Ticket mới được tạo', en: 'New ticket created' },
    status_changed: { vi: 'Ticket đổi trạng thái', en: 'Ticket status changed' },
    assigned: { vi: 'Bạn được giao ticket', en: 'You were assigned a ticket' },
    sla_warning: { vi: 'Cảnh báo SLA', en: 'SLA warning' },
    comment: { vi: 'Bình luận mới', en: 'New comment' },
    mention: { vi: 'Bạn được nhắc đến', en: 'You were mentioned' },
  };
  const entry = map[type] || { vi: 'Thông báo', en: 'Notification' };
  return lang === 'en' ? entry.en : entry.vi;
}
