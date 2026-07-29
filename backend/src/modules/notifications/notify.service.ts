import { query } from '../../config/db';
import { emitToUser } from '../../realtime/io';

export type NotificationType =
  | 'ticket_created'
  | 'status_changed'
  | 'assigned'
  | 'sla_warning'
  | 'comment'
  | 'mention'
  | 'ticket_resolved';

export interface NotifyInput {
  userId: string;
  ticketId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  /** Optional ticket context used to render richer emails. */
  emailMeta?: { code?: string; title?: string; status?: string };
}

/**
 * Persist an in-app notification and push it over WebSocket in realtime.
 * Email delivery is delegated to the (pluggable) email adapter.
 */
export async function notify(input: NotifyInput): Promise<void> {
  const { rows } = await query(
    `INSERT INTO notifications(user_id, ticket_id, type, title, message)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at`,
    [input.userId, input.ticketId ?? null, input.type, input.title, input.message]
  );
  emitToUser(input.userId, 'notification', {
    id: rows[0].id,
    ticketId: input.ticketId ?? null,
    type: input.type,
    title: input.title,
    message: input.message,
    isRead: false,
    createdAt: rows[0].created_at,
  });
  // Email adapter (no-op unless configured) — see email.adapter.ts
  void sendEmailSafe(input);
}

export async function notifyMany(userIds: string[], base: Omit<NotifyInput, 'userId'>): Promise<void> {
  const unique = [...new Set(userIds)].filter(Boolean);
  await Promise.all(unique.map((userId) => notify({ ...base, userId })));
}

async function sendEmailSafe(input: NotifyInput) {
  try {
    const { sendEmail } = await import('./email.adapter');
    await sendEmail(input, {
      code: input.emailMeta?.code,
      title: input.emailMeta?.title,
      status: input.emailMeta?.status,
      ticketId: input.ticketId ?? null,
    });
  } catch {
    /* email is best-effort */
  }
}
