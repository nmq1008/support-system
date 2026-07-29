import { useTranslation } from 'react-i18next';
import { PriorityLevel, TicketStatus } from '../lib/types';
import { PRIORITY_COLOR, STATUS_COLOR, STATUS_DARK_TEXT } from '../lib/format';

export function StatusBadge({ status }: { status: TicketStatus }) {
  const { t } = useTranslation();
  const bg = STATUS_COLOR[status];
  const dark = STATUS_DARK_TEXT.includes(status);
  return (
    <span className="status-badge" style={{ background: bg, color: dark ? '#131825' : '#fff' }}>
      {t(`status.${status}`)}
    </span>
  );
}

export function PriorityBadge({ level }: { level: PriorityLevel }) {
  return (
    <span className="priority-badge" style={{ background: PRIORITY_COLOR[level] }}>
      {level}
    </span>
  );
}

const CUSTOMER_PRIORITY_COLOR: Record<string, string> = {
  platinum: '#6366F1', gold: '#D97706', silver: '#64748B', bronze: '#92400E',
};
export function CustomerPriorityBadge({ value }: { value: string }) {
  return (
    <span className="tag-chip" style={{ background: `${CUSTOMER_PRIORITY_COLOR[value] || '#64748B'}22`, color: CUSTOMER_PRIORITY_COLOR[value] || '#64748B', textTransform: 'capitalize' }}>
      {value}
    </span>
  );
}

const PROJECT_PRIORITY_COLOR: Record<string, string> = {
  critical: '#DC2626', high: '#F97316', medium: '#2563EB', low: '#64748B',
};
export function ProjectPriorityBadge({ value }: { value: string }) {
  if (!value) return null;
  return (
    <span className="tag-chip" style={{ background: `${PROJECT_PRIORITY_COLOR[value] || '#64748B'}22`, color: PROJECT_PRIORITY_COLOR[value] || '#64748B', textTransform: 'capitalize' }}>
      {value}
    </span>
  );
}
