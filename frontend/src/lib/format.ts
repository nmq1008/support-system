import { PriorityLevel, TicketStatus } from './types';

export const PRIORITY_COLOR: Record<PriorityLevel, string> = {
  P1: '#B91C1C', P2: '#EF4444', P3: '#F97316', P4: '#EAB308', P5: '#22C55E',
};

export const STATUS_COLOR: Record<TicketStatus, string> = {
  null: '#9CA3AF', open: '#3B82F6', in_progress: '#F97316', build: '#8B5CF6',
  testing: '#EAB308', deploy: '#16A34A', recheck: '#06B6D4', waiting: '#EF4444',
  on_hold: '#92400E', complete: '#86EFAC', resolved: '#6EE7B7', close: '#374151', reopen: '#DC2626',
};

/** Statuses needing dark text for contrast on light badges. */
export const STATUS_DARK_TEXT: TicketStatus[] = ['complete', 'resolved', 'null'];

export function relativeTime(iso: string | null, lang: string): string {
  if (!iso) return '—';
  const d = new Date(iso).getTime();
  const diff = d - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(lang === 'en' ? 'en' : 'vi', { numeric: 'auto' });
  const mins = Math.round(diff / 60000);
  if (abs < 3600000) return rtf.format(mins, 'minute');
  const hours = Math.round(diff / 3600000);
  if (abs < 86400000) return rtf.format(hours, 'hour');
  return rtf.format(Math.round(diff / 86400000), 'day');
}

export function formatDate(iso: string | null, lang: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(lang === 'en' ? 'en-GB' : 'vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function initials(name?: string): string {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(-2).map((s) => s[0]).join('').toUpperCase();
}
