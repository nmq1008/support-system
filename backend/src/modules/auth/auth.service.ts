import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../config/db';
import { env } from '../../config/env';
import { unauthorized } from '../../utils/httpError';
import { AuthUser } from '../../types/express';
import { Role } from '../../domain/types';

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  org_id: string | null;
  language: 'vi' | 'en';
  active: boolean;
}

/** Load the full auth context (roles + project/org access) for a user id. */
export async function loadAuthUser(userId: string): Promise<AuthUser | null> {
  const { rows } = await query<UserRow>('SELECT * FROM users WHERE id = $1 AND active = TRUE', [userId]);
  const u = rows[0];
  if (!u) return null;

  const projects = await query<{ project_id: string }>(
    'SELECT project_id FROM user_project_access WHERE user_id = $1',
    [userId]
  );
  const orgs = await query<{ org_id: string }>('SELECT org_id FROM user_org_access WHERE user_id = $1', [
    userId,
  ]);

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    orgId: u.org_id,
    language: u.language,
    projectIds: projects.rows.map((r) => r.project_id),
    managedOrgIds: orgs.rows.map((r) => r.org_id),
  };
}

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const { rows } = await query<UserRow>('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  const u = rows[0];
  if (!u || !u.active) throw unauthorized('Email hoặc mật khẩu không đúng');

  const ok = await bcrypt.compare(password, u.password_hash);
  if (!ok) throw unauthorized('Email hoặc mật khẩu không đúng');

  const authUser = (await loadAuthUser(u.id))!;
  const token = jwt.sign({ sub: u.id, role: u.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as jwt.SignOptions);
  return { token, user: authUser };
}

export function verifyToken(token: string): { sub: string; role: Role } {
  try {
    return jwt.verify(token, env.jwtSecret) as { sub: string; role: Role };
  } catch {
    throw unauthorized('Token không hợp lệ hoặc đã hết hạn');
  }
}
