import { NextFunction, Request, Response } from 'express';
import { forbidden, unauthorized } from '../utils/httpError';
import { Role } from '../domain/types';

/** Require the authenticated user to hold one of the given roles. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(forbidden('Bạn không có quyền thực hiện thao tác này'));
    }
    next();
  };
}

/** Roles allowed to administer configuration (SLA, templates, users, orgs/projects). */
export const ADMIN_ROLES: Role[] = ['super_admin', 'csm'];
/** Internal staff who can be assigned tickets & see internal comments. */
export const STAFF = ['super_admin', 'csm', 'dev_lead', 'dev', 'gate'] as const;

export function isStaff(role: Role): boolean {
  return (STAFF as readonly string[]).includes(role);
}
