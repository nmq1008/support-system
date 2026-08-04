import { Role, TicketStatus } from './types';

/**
 * Coarse status buckets so users can track tickets easily without wading through
 * all 12 statuses (Excel row 5). Used as quick tabs on the ticket list.
 */
export const STATUS_BUCKETS: { key: string; label: string; statuses: TicketStatus[] }[] = [
  { key: '', label: 'all', statuses: [] },
  { key: 'open', label: 'bucketOpen', statuses: ['open', 'reopen'] },
  { key: 'active', label: 'bucketActive', statuses: ['in_progress', 'build', 'testing', 'deploy', 'recheck'] },
  { key: 'waiting', label: 'bucketWaiting', statuses: ['waiting', 'on_hold'] },
  { key: 'done', label: 'bucketDone', statuses: ['complete', 'resolved', 'close'] },
];

/** Statuses relevant to each role — keeps the status filter focused per user. */
export const ROLE_STATUSES: Record<Role, TicketStatus[]> = {
  super_admin: [],
  csm: [],
  dev: ['in_progress', 'build', 'testing', 'deploy', 'recheck', 'complete', 'waiting', 'on_hold'],
  dev_lead: ['in_progress', 'build', 'testing', 'deploy', 'recheck', 'complete'],
  gate: ['open', 'reopen', 'waiting', 'on_hold', 'resolved', 'close'],
  customer_admin: ['open', 'reopen', 'waiting', 'resolved', 'complete', 'close'],
  customer: ['open', 'reopen', 'waiting', 'resolved', 'complete', 'close'],
};

/** The status options to show a user in the filter (all statuses if none configured). */
export function statusOptionsForRole(role: Role, all: TicketStatus[]): TicketStatus[] {
  const set = ROLE_STATUSES[role];
  return set && set.length ? all.filter((s) => set.includes(s)) : all;
}

/** Mirror of backend TRANSITIONS (for UX; backend enforces authoritatively). */
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

/** Mandatory metadata fields per target status (mirror of backend REQUIRED_ON_STATUS). */
export const REQUIRED_META: Partial<Record<TicketStatus, { key: string; type: 'text' | 'date' }[]>> = {
  waiting: [
    { key: 'waiting_for_whom', type: 'text' },
    { key: 'waiting_for_what', type: 'text' },
    { key: 'follow_deadline', type: 'date' },
  ],
  on_hold: [
    { key: 'hold_reason', type: 'text' },
    { key: 'review_date', type: 'date' },
  ],
  reopen: [
    { key: 'reopen_reason', type: 'text' },
    { key: 'root_cause', type: 'text' },
  ],
  deploy: [
    { key: 'deploy_environment', type: 'text' },
    { key: 'deploy_time', type: 'text' },
    { key: 'deploy_by', type: 'text' },
  ],
};
