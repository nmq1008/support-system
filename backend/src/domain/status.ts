import { badRequest } from '../utils/httpError';
import { TicketStatus } from './types';

/**
 * ───────────────────────────────────────────────────────────────
 * TICKET STATUS STATE MACHINE
 * ───────────────────────────────────────────────────────────────
 * Vòng đời chuẩn:
 *   Null → Open → In Progress → Build → Testing → Deploy → Recheck → Complete/Resolved → Close
 * Đặc biệt: Waiting, On Hold, Reopen
 */

/** Allowed transitions. Empty target set = terminal-ish (still reopenable). */
export const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  null: ['open'],
  open: ['in_progress', 'waiting', 'on_hold', 'resolved', 'close'],
  in_progress: ['build', 'testing', 'waiting', 'on_hold', 'resolved', 'complete', 'close'],
  build: ['testing', 'in_progress', 'waiting', 'on_hold'],
  testing: ['deploy', 'build', 'in_progress', 'waiting', 'on_hold'],
  deploy: ['recheck', 'in_progress', 'waiting', 'on_hold'],
  recheck: ['complete', 'in_progress', 'testing'],
  complete: ['close', 'reopen'],
  resolved: ['close', 'reopen'],
  close: ['reopen'],
  waiting: ['in_progress', 'on_hold', 'close'],
  on_hold: ['in_progress', 'waiting', 'close'],
  reopen: ['in_progress', 'open'],
};

/** Status → badge colour (spec §TICKET STATUS). */
export const STATUS_COLOR: Record<TicketStatus, string> = {
  null: '#9CA3AF',
  open: '#3B82F6',
  in_progress: '#F97316',
  build: '#8B5CF6',
  testing: '#EAB308',
  deploy: '#16A34A',
  recheck: '#06B6D4',
  waiting: '#EF4444',
  on_hold: '#92400E',
  complete: '#86EFAC',
  resolved: '#6EE7B7',
  close: '#374151',
  reopen: '#DC2626',
};

/** Statuses that count as "open work" for dashboard/workload. */
export const OPEN_STATUSES: TicketStatus[] = [
  'open',
  'in_progress',
  'build',
  'testing',
  'deploy',
  'recheck',
  'waiting',
  'on_hold',
  'reopen',
];

export const CLOSED_STATUSES: TicketStatus[] = ['complete', 'resolved', 'close'];

export type MandatoryField =
  | 'waiting_for_whom'
  | 'waiting_for_what'
  | 'follow_deadline'
  | 'hold_reason'
  | 'review_date'
  | 'reopen_reason'
  | 'root_cause'
  | 'deploy_environment'
  | 'deploy_time'
  | 'deploy_by';

/** Extra fields that MUST accompany a transition into a given status. */
export const REQUIRED_ON_STATUS: Partial<Record<TicketStatus, MandatoryField[]>> = {
  waiting: ['waiting_for_whom', 'waiting_for_what', 'follow_deadline'],
  on_hold: ['hold_reason', 'review_date'],
  reopen: ['reopen_reason', 'root_cause'],
  deploy: ['deploy_environment', 'deploy_time', 'deploy_by'],
};

export interface StatusChangeInput {
  from: TicketStatus;
  to: TicketStatus;
  meta?: Record<string, unknown>;
}

/**
 * Validate a status transition. Throws HttpError(400) if the transition is
 * illegal or the mandatory metadata for the target status is missing.
 */
export function assertTransition(input: StatusChangeInput): void {
  const { from, to, meta = {} } = input;

  if (from === to) {
    throw badRequest('STATUS_NOOP', `Ticket is already in status "${to}".`);
  }

  const allowed = TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw badRequest(
      'STATUS_TRANSITION_INVALID',
      `Cannot move ticket from "${from}" to "${to}".`,
      { allowed }
    );
  }

  const required = REQUIRED_ON_STATUS[to] || [];
  const missing = required.filter((f) => {
    const v = meta[f];
    return v === undefined || v === null || String(v).trim() === '';
  });
  if (missing.length) {
    throw badRequest(
      'STATUS_META_REQUIRED',
      `Status "${to}" requires: ${missing.join(', ')}.`,
      { missing, required }
    );
  }
}

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return (TRANSITIONS[from] || []).includes(to);
}
