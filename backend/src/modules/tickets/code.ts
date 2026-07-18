import { PoolClient } from 'pg';
import { pool } from '../../config/db';

/** Allocate the next human-readable ticket code (HD-0001, HD-0002, …). */
export async function nextTicketCode(client?: PoolClient): Promise<string> {
  const runner = client ?? pool;
  const { rows } = await runner.query<{ n: string }>("SELECT nextval('ticket_code_seq') AS n");
  const n = Number(rows[0].n);
  return `HD-${String(n).padStart(4, '0')}`;
}
