import { AuthUser } from '../../types/express';

/**
 * Build the SQL visibility predicate for tickets based on role & scope.
 *
 * Quy tắc phân quyền:
 *  - Super Admin      : thấy tất cả
 *  - CSM              : toàn bộ ticket trong org được quản lý
 *  - Dev Lead / Dev / Gate : ticket trong project được assign (Dev cũng thấy ticket được assign owner)
 *  - Customer Admin   : toàn bộ ticket trong org của họ
 *  - Customer         : chỉ ticket của chính họ (trong project được phép)
 *
 * Returns a WHERE fragment (without the leading WHERE) plus positional params.
 * `startIndex` is the next $n placeholder number to use.
 */
export interface ScopeSql {
  clause: string;
  params: unknown[];
}

export function ticketScope(user: AuthUser, startIndex = 1): ScopeSql {
  const params: unknown[] = [];
  let i = startIndex;

  switch (user.role) {
    case 'super_admin':
      return { clause: 'TRUE', params };

    case 'csm': {
      if (!user.managedOrgIds.length) return { clause: 'FALSE', params };
      params.push(user.managedOrgIds);
      return { clause: `t.org_id = ANY($${i++})`, params };
    }

    case 'dev_lead':
    case 'dev':
    case 'gate': {
      // tickets in assigned projects OR directly owned by the user
      const parts: string[] = [];
      if (user.projectIds.length) {
        params.push(user.projectIds);
        parts.push(`t.project_id = ANY($${i++})`);
      }
      params.push(user.id);
      parts.push(`t.owner_id = $${i++}`);
      return { clause: `(${parts.join(' OR ')})`, params };
    }

    case 'customer_admin': {
      if (!user.orgId) return { clause: 'FALSE', params };
      params.push(user.orgId);
      return { clause: `t.org_id = $${i++}`, params };
    }

    case 'customer':
    default: {
      params.push(user.id);
      return { clause: `t.customer_id = $${i++}`, params };
    }
  }
}

/** Can this user act on (edit/assign/change status) a given ticket row? */
export function canManageTicket(user: AuthUser, ticket: { project_id: string; org_id: string; owner_id: string | null; customer_id: string | null }): boolean {
  switch (user.role) {
    case 'super_admin':
      return true;
    case 'csm':
      return user.managedOrgIds.includes(ticket.org_id);
    case 'dev_lead':
    case 'dev':
    case 'gate':
      return user.projectIds.includes(ticket.project_id) || ticket.owner_id === user.id;
    case 'customer_admin':
      return ticket.org_id === user.orgId;
    case 'customer':
      return ticket.customer_id === user.id;
    default:
      return false;
  }
}

/** Can this user even view the ticket row? (superset of manage for customer_admin) */
export function canViewTicket(user: AuthUser, ticket: { project_id: string; org_id: string; owner_id: string | null; customer_id: string | null }): boolean {
  if (user.role === 'customer') return ticket.customer_id === user.id;
  return canManageTicket(user, ticket);
}
