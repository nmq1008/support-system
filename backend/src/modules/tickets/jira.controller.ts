import { Request, Response } from 'express';
import { query } from '../../config/db';
import { env } from '../../config/env';
import { forbidden, notFound } from '../../utils/httpError';
import { canViewTicket } from './access';
import { buildAutoGuide, JiraTicketContext } from '../../domain/jira';
import { PriorityLevel } from '../../domain/types';

const FRONTEND_TICKET_URL = (code: string) => `${env.corsOrigin}/tickets/${code}`;

/** Assemble the Jira context for a ticket and build the Auto Guide. */
export async function buildJiraGuide(req: Request, res: Response) {
  const { rows } = await query<any>(
    `SELECT t.*, p.name AS project_name, p.code AS project_code, p.jira_url, p.jira_key,
            o.name AS org_name, cu.name AS customer_name
     FROM tickets t
     JOIN projects p ON p.id = t.project_id
     JOIN organizations o ON o.id = t.org_id
     LEFT JOIN users cu ON cu.id = t.customer_id
     WHERE t.id = $1`,
    [req.params.id]
  );
  const t = rows[0];
  if (!t) throw notFound('Ticket không tồn tại');
  if (!canViewTicket(req.user!, t)) throw forbidden();

  const fields = await query<{ field_key: string; field_value: string }>(
    'SELECT field_key, field_value FROM ticket_fields WHERE ticket_id = $1',
    [t.id]
  );
  const fmap = Object.fromEntries(fields.rows.map((f) => [f.field_key, f.field_value]));

  const atts = await query<{ file_name: string }>(
    'SELECT file_name FROM attachments WHERE ticket_id = $1',
    [t.id]
  );

  const ctx: JiraTicketContext = {
    ticketId: t.id,
    code: t.code,
    title: t.title,
    description: t.description || fmap['description'] || '',
    priorityLevel: t.priority_level as PriorityLevel,
    category: t.category,
    projectName: t.project_name,
    projectKey: t.jira_key,
    jiraUrl: t.jira_url,
    orgName: t.org_name,
    customerName: t.customer_name || 'N/A',
    hid180Url: FRONTEND_TICKET_URL(t.code),
    stepsToReproduce: fmap['steps'],
    expected: fmap['expected'],
    actual: fmap['actual'],
    environment: fmap['environment'],
    attachments: atts.rows.map((a) => a.file_name),
  };

  res.json(buildAutoGuide(ctx));
}

/** Link a Jira issue id/url back to the HiDesk ticket. */
export async function linkJiraIssue(req: Request, res: Response) {
  const { rows } = await query<any>('SELECT * FROM tickets WHERE id = $1', [req.params.id]);
  const t = rows[0];
  if (!t) throw notFound('Ticket không tồn tại');
  if (!canViewTicket(req.user!, t)) throw forbidden();

  await query('UPDATE tickets SET jira_issue_id = $1, jira_issue_url = $2 WHERE id = $3', [
    req.body.jiraIssueId,
    req.body.jiraIssueUrl || null,
    t.id,
  ]);
  await query(
    `INSERT INTO ticket_history(ticket_id, changed_by, action, field, new_value, note)
     VALUES ($1,$2,'jira_link','jira_issue_id',$3,'Linked Jira issue')`,
    [t.id, req.user!.id, req.body.jiraIssueId]
  );
  res.json({ ok: true, jiraIssueId: req.body.jiraIssueId, jiraIssueUrl: req.body.jiraIssueUrl || null });
}
