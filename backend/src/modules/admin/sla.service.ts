import { query } from '../../config/db';
import {
  BASE_SLA,
  CUSTOMER_FACTOR,
  PROJECT_FACTOR,
  SlaComputation,
} from '../../domain/priority';
import {
  CustomerPriority,
  PriorityLevel,
  ProjectPriority,
} from '../../domain/types';

/**
 * ───────────────────────────────────────────────────────────────
 * CONFIGURABLE SLA
 * ───────────────────────────────────────────────────────────────
 * The admin-editable `sla_config` matrix stores the response/resolve
 * hours for every (priority × customer-tier) pair. It is the source of
 * truth for ticket SLA — the project-priority factor is still applied
 * on top so a Critical project stays tighter than a Low one.
 *
 * The matrix is tiny and rarely changes, so we cache it in memory and
 * invalidate on every admin edit.
 */

interface Cell {
  responseHours: number;
  resolveHours: number;
}

let cache: Map<string, Cell> | null = null;

const key = (level: string, customer: string) => `${level}:${customer}`;

/** Load (and cache) the stored SLA matrix. */
async function loadMatrix(): Promise<Map<string, Cell>> {
  if (cache) return cache;
  const map = new Map<string, Cell>();
  const { rows } = await query<{
    priority_level: string;
    customer_priority: string;
    response_hours: string;
    resolve_hours: string;
  }>('SELECT priority_level, customer_priority, response_hours, resolve_hours FROM sla_config');
  for (const r of rows) {
    map.set(key(r.priority_level, r.customer_priority), {
      responseHours: Number(r.response_hours),
      resolveHours: Number(r.resolve_hours),
    });
  }
  cache = map;
  return map;
}

/** Drop the cache after an admin edit so the next ticket picks up new values. */
export function invalidateSlaCache(): void {
  cache = null;
}

/**
 * Compute concrete SLA deadlines using the admin-configured matrix.
 * Falls back to the hardcoded base × customer factor when a cell is
 * missing, then applies the project-priority factor.
 */
export async function computeConfiguredSla(
  level: PriorityLevel,
  customer: CustomerPriority,
  project: ProjectPriority,
  from: Date = new Date()
): Promise<SlaComputation> {
  const matrix = await loadMatrix();
  const cell = matrix.get(key(level, customer));
  const baseResponse = cell ? cell.responseHours : BASE_SLA[level].responseHours * CUSTOMER_FACTOR[customer];
  const baseResolve = cell ? cell.resolveHours : BASE_SLA[level].resolveHours * CUSTOMER_FACTOR[customer];
  const projectFactor = PROJECT_FACTOR[project];
  const responseHours = round2(baseResponse * projectFactor);
  const resolveHours = round2(baseResolve * projectFactor);
  return {
    responseHours,
    resolveHours,
    effectiveFactor: round2(projectFactor),
    responseDeadline: addHours(from, responseHours),
    resolveDeadline: addHours(from, resolveHours),
  };
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
