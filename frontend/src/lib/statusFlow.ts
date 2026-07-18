import { TicketStatus } from './types';

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
