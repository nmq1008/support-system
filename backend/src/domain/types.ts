/** Shared domain enums & types for HiDesk. */

export type Role =
  | 'super_admin'
  | 'csm'
  | 'dev_lead'
  | 'dev'
  | 'gate'
  | 'customer_admin'
  | 'customer';

export const ROLES: Role[] = [
  'super_admin',
  'csm',
  'dev_lead',
  'dev',
  'gate',
  'customer_admin',
  'customer',
];

/** Roles that are internal staff (BHBT team) vs. external customer roles. */
export const STAFF_ROLES: Role[] = ['super_admin', 'csm', 'dev_lead', 'dev', 'gate'];
export const CUSTOMER_ROLES: Role[] = ['customer_admin', 'customer'];

export type CustomerPriority = 'platinum' | 'gold' | 'silver' | 'bronze';
export const CUSTOMER_PRIORITIES: CustomerPriority[] = ['platinum', 'gold', 'silver', 'bronze'];

export type ProjectPriority = 'critical' | 'high' | 'medium' | 'low';
export const PROJECT_PRIORITIES: ProjectPriority[] = ['critical', 'high', 'medium', 'low'];

export type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
export const PRIORITY_LEVELS: PriorityLevel[] = ['P1', 'P2', 'P3', 'P4', 'P5'];

export type TicketStatus =
  | 'null'
  | 'open'
  | 'in_progress'
  | 'build'
  | 'testing'
  | 'deploy'
  | 'recheck'
  | 'complete'
  | 'resolved'
  | 'close'
  | 'waiting'
  | 'on_hold'
  | 'reopen';

export const TICKET_STATUSES: TicketStatus[] = [
  'null',
  'open',
  'in_progress',
  'build',
  'testing',
  'deploy',
  'recheck',
  'complete',
  'resolved',
  'close',
  'waiting',
  'on_hold',
  'reopen',
];
