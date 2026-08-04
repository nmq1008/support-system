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

/** Visual meta (icon + colour + short description) per template category. */
export const TEMPLATE_META: Record<string, { icon: string; color: string; descVi: string; descEn: string }> = {
  bug: { icon: 'bug', color: '#EF4444', descVi: 'Báo lỗi, sự cố hệ thống', descEn: 'Report a bug or system issue' },
  feature: { icon: 'sparkles', color: '#7C3AED', descVi: 'Đề xuất tính năng mới', descEn: 'Request a new feature' },
  help: { icon: 'lifebuoy', color: '#0891B2', descVi: 'Hướng dẫn, hỗ trợ thao tác', descEn: 'How-to / operational support' },
  billable: { icon: 'card', color: '#D97706', descVi: 'Yêu cầu có tính phí', descEn: 'Billable request' },
  custom: { icon: 'template', color: '#2563EB', descVi: 'Mẫu tuỳ chỉnh', descEn: 'Custom template' },
};
export function templateMeta(category?: string | null) {
  return TEMPLATE_META[(category || 'custom').toLowerCase()] || TEMPLATE_META.custom;
}

const BASE_RESOLVE: Record<string, number> = { P1: 4, P2: 8, P3: 24, P4: 72, P5: 120 };
const CUSTOMER_FACTOR: Record<string, number> = { platinum: 0.5, gold: 0.75, silver: 1, bronze: 1.5 };
const PROJECT_FACTOR: Record<string, number> = { critical: 0.75, high: 0.9, medium: 1, low: 1.25 };

/** Rough client-side SLA resolve estimate (hours), mirroring the backend engine. */
export function estimateResolveHours(level: string, customerPriority?: string, projectPriority?: string): number {
  const base = BASE_RESOLVE[level] ?? 24;
  const cf = CUSTOMER_FACTOR[(customerPriority || 'silver').toLowerCase()] ?? 1;
  const pf = PROJECT_FACTOR[(projectPriority || 'medium').toLowerCase()] ?? 1;
  return Math.round(base * cf * pf * 10) / 10;
}
export function humanHours(h: number, lang: string): string {
  if (h < 24) return `${h}${lang === 'en' ? 'h' : ' giờ'}`;
  const d = Math.floor(h / 24);
  const r = Math.round(h - d * 24);
  return r ? `${d}${lang === 'en' ? 'd' : ' ngày'} ${r}${lang === 'en' ? 'h' : 'h'}` : `${d}${lang === 'en' ? 'd' : ' ngày'}`;
}
