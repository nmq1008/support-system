export type Role =
  | 'super_admin' | 'csm' | 'dev_lead' | 'dev' | 'gate' | 'customer_admin' | 'customer';

export type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
export type TicketStatus =
  | 'null' | 'open' | 'in_progress' | 'build' | 'testing' | 'deploy' | 'recheck'
  | 'complete' | 'resolved' | 'close' | 'waiting' | 'on_hold' | 'reopen';

export interface AuthUser {
  id: string; name: string; email: string; role: Role;
  orgId: string | null; language: 'vi' | 'en';
  projectIds: string[]; managedOrgIds: string[];
}

export interface Ticket {
  id: string; code: string; title: string; description?: string;
  status: TicketStatus; priority_level: PriorityLevel; category?: string;
  org_id: string; project_id: string; owner_id: string | null; customer_id: string | null;
  project_name?: string; org_name?: string; owner_name?: string; customer_name?: string;
  project_priority?: string; customer_priority?: string;
  assignees?: { id: string; name: string }[];
  tags?: Tag[];
  statusColor: string; priorityColor: string; escalated?: boolean; reopen_count?: number;
  jira_issue_id?: string | null; jira_issue_url?: string | null;
  created_at: string; updated_at?: string;
  sla: { resolveDeadline: string | null; responseDeadline: string | null; remainingFraction: number | null; breached: boolean; atRisk: boolean; pausedAt: string | null };
}

export interface TicketDetail extends Ticket {
  project_code?: string; jira_url?: string | null; jira_key?: string | null;
  fields: { field_key: string; field_value: string }[];
  comments: Comment[];
  history: HistoryItem[];
  tags: Tag[];
  attachments: Attachment[];
  assignees: { id: string; name: string }[];
  reviews: Review[];
}

export interface Review {
  id: string; ticket_id: string; reviewer_id: string | null; dev_id: string;
  rating: number; quality?: number | null; timeliness?: number | null;
  comment?: string | null; created_at: string; reviewer_name?: string; dev_name?: string;
}

export interface Comment {
  id: string; ticket_id: string; user_id: string | null; content: string;
  is_internal: boolean; mentions: string[]; created_at: string;
  user_name?: string; user_avatar?: string; attachments?: Attachment[];
}
export interface HistoryItem {
  id: string; action: string; old_status?: string; new_status?: string;
  field?: string; old_value?: string; new_value?: string; note?: string;
  changed_by_name?: string; changed_at: string; meta?: Record<string, unknown>;
}
export interface Tag { id: string; name: string; color: string; }
export interface Attachment { id: string; file_url: string; file_name: string; file_size: number; mime_type?: string; }

export interface Org { id: string; name: string; code: string; customer_priority: string; project_count?: number; }
export interface Project { id: string; org_id: string; name: string; code: string; project_priority: string; org_name?: string; jira_url?: string; jira_key?: string; board_columns?: string[]; active: boolean; }
export interface User { id: string; name: string; email: string; role: Role; language: string; }

export interface TemplateField {
  key: string; type: string;
  label: { vi: string; en: string };
  placeholder?: string; required?: boolean; tooltip?: string;
  options?: { value: string; label: { vi: string; en: string } }[];
}
export interface Template {
  id: string; name: string; name_en?: string; description?: string; icon?: string;
  category?: string; is_global: boolean; is_default: boolean; fields_schema: TemplateField[];
}

export interface Notification {
  id: string; ticket_id: string | null; type: string; title?: string;
  message: string; is_read: boolean; created_at: string; ticket_code?: string;
}

export interface Paginated<T> { items: T[]; pagination: { page: number; pageSize: number; total: number; totalPages: number }; }
