import {
  CustomerPriority,
  PriorityLevel,
  ProjectPriority,
} from './types';

/**
 * ───────────────────────────────────────────────────────────────
 * PRIORITY ENGINE (3 cấp độ)
 * ───────────────────────────────────────────────────────────────
 *  SLA thực tế = Base SLA × hệ số Customer Priority × hệ số Project Priority
 */

/** Base SLA per issue priority level (hours). Source of truth mirrored in sla_config. */
export interface BaseSla {
  responseHours: number;
  resolveHours: number;
}

export const BASE_SLA: Record<PriorityLevel, BaseSla> = {
  P1: { responseHours: 2, resolveHours: 4 }, // Blocker
  P2: { responseHours: 4, resolveHours: 8 }, // Critical
  P3: { responseHours: 8, resolveHours: 24 }, // Major
  P4: { responseHours: 24, resolveHours: 72 }, // Minor  (3 ngày)
  P5: { responseHours: 48, resolveHours: 120 }, // Trivial (5 ngày)
};

/** Customer priority multiplier — Platinum resolves twice as fast. */
export const CUSTOMER_FACTOR: Record<CustomerPriority, number> = {
  platinum: 0.5,
  gold: 0.75,
  silver: 1,
  bronze: 1.5,
};

/**
 * Project priority multiplier — a Critical production project tightens the SLA,
 * a Low-priority project relaxes it.
 */
export const PROJECT_FACTOR: Record<ProjectPriority, number> = {
  critical: 0.75,
  high: 0.9,
  medium: 1,
  low: 1.25,
};

/** Platinum customers escalate P1/P2 straight to the Dev Lead. */
export function shouldEscalateImmediately(
  customer: CustomerPriority,
  level: PriorityLevel
): boolean {
  return customer === 'platinum' && (level === 'P1' || level === 'P2');
}

export interface SlaComputation {
  responseHours: number;
  resolveHours: number;
  effectiveFactor: number;
  responseDeadline: Date;
  resolveDeadline: Date;
}

/**
 * Compute the concrete SLA deadlines for a ticket.
 * @param level     issue priority (P1..P5)
 * @param customer  customer-tier priority
 * @param project   project priority
 * @param from      the moment the clock starts (default: now)
 */
export function computeSla(
  level: PriorityLevel,
  customer: CustomerPriority,
  project: ProjectPriority,
  from: Date = new Date()
): SlaComputation {
  const base = BASE_SLA[level];
  const factor = CUSTOMER_FACTOR[customer] * PROJECT_FACTOR[project];
  const responseHours = round2(base.responseHours * factor);
  const resolveHours = round2(base.resolveHours * factor);
  return {
    responseHours,
    resolveHours,
    effectiveFactor: round2(factor),
    responseDeadline: addHours(from, responseHours),
    resolveDeadline: addHours(from, resolveHours),
  };
}

/** Fraction of resolve-SLA remaining (0..1); negative means already breached. */
export function slaRemainingFraction(deadline: Date, createdAt: Date, now = new Date()): number {
  const total = deadline.getTime() - createdAt.getTime();
  if (total <= 0) return 0;
  const left = deadline.getTime() - now.getTime();
  return left / total;
}

export function isBreached(deadline: Date | null, now = new Date()): boolean {
  return !!deadline && deadline.getTime() < now.getTime();
}

/** UI colour per issue priority. */
export const PRIORITY_COLOR: Record<PriorityLevel, string> = {
  P1: '#B91C1C', // đỏ đậm
  P2: '#EF4444', // đỏ
  P3: '#F97316', // cam
  P4: '#EAB308', // vàng
  P5: '#22C55E', // xanh lá
};

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
