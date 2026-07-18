import { Role } from '../domain/types';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  orgId: string | null;
  language: 'vi' | 'en';
  /** project ids the user has explicit access to */
  projectIds: string[];
  /** org ids a CSM manages */
  managedOrgIds: string[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
