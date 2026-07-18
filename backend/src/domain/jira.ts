import { PriorityLevel } from './types';

/**
 * ───────────────────────────────────────────────────────────────
 * JIRA INTEGRATION — Auto Guide + Description generator
 * ───────────────────────────────────────────────────────────────
 */

/** Map HiDesk P1..P5 → Jira priority names. */
export const JIRA_PRIORITY_MAP: Record<PriorityLevel, string> = {
  P1: 'Highest',
  P2: 'High',
  P3: 'Medium',
  P4: 'Low',
  P5: 'Lowest',
};

export type JiraIssueType = 'Bug' | 'Story' | 'Task';

/** Map HiDesk template/category → Jira issue type. */
export function mapIssueType(category?: string | null): JiraIssueType {
  const c = (category || '').toLowerCase();
  if (c.includes('bug') || c.includes('lỗi') || c.includes('loi')) return 'Bug';
  if (c.includes('feature') || c.includes('tính năng') || c.includes('tinh nang')) return 'Story';
  return 'Task';
}

export interface JiraTicketContext {
  ticketId: string;
  code: string;
  title: string;
  description: string;
  priorityLevel: PriorityLevel;
  category?: string | null;
  projectName: string;
  projectKey?: string | null;
  jiraUrl?: string | null;
  orgName: string;
  customerName: string;
  hid180Url: string; // full URL to the ticket in HiDesk
  stepsToReproduce?: string | null;
  expected?: string | null;
  actual?: string | null;
  environment?: string | null;
  attachments?: string[];
}

/** Build the Jira-formatted (wiki markup) description body. */
export function buildJiraDescription(ctx: JiraTicketContext): string {
  const attachments = ctx.attachments?.length ? ctx.attachments.join(', ') : 'None';
  return [
    'h2. Summary',
    ctx.title,
    '',
    'h2. Description',
    ctx.description || '-',
    '',
    'h2. Steps to Reproduce',
    ctx.stepsToReproduce?.trim() || '1. -',
    '',
    'h2. Expected Result',
    ctx.expected?.trim() || '-',
    '',
    'h2. Actual Result',
    ctx.actual?.trim() || '-',
    '',
    'h2. Environment',
    `- Project: ${ctx.projectName}`,
    `- Reporter: ${ctx.customerName}`,
    `- HiDesk Ticket: ${ctx.code} (${ctx.hid180Url})`,
    `- Priority: ${ctx.priorityLevel}`,
    `- Attachments: ${attachments}`,
  ].join('\n');
}

export interface JiraGuideStep {
  step: number;
  title: string;
  value?: string;
  hint?: string;
}

/**
 * Generate the step-by-step Auto Guide (no Jira account required).
 * Returns structured steps + the pre-built payload the user copies into Jira.
 */
export function buildAutoGuide(ctx: JiraTicketContext) {
  const issueType = mapIssueType(ctx.category);
  const description = buildJiraDescription(ctx);
  const labels = [slug(ctx.projectName), slug(ctx.orgName), ctx.code].filter(Boolean);

  const steps: JiraGuideStep[] = [
    { step: 1, title: 'Truy cập Jira Project', value: ctx.jiraUrl || '(chưa cấu hình Jira URL cho project)' },
    { step: 2, title: 'Click "Create Issue"' },
    { step: 3, title: 'Issue Type', value: issueType },
    { step: 4, title: 'Summary', value: ctx.title, hint: 'Copy tiêu đề ticket' },
    { step: 5, title: 'Description', value: description, hint: 'Paste nguyên khối định dạng Jira bên dưới' },
    { step: 6, title: 'Priority', value: JIRA_PRIORITY_MAP[ctx.priorityLevel] },
    { step: 7, title: 'Labels', value: labels.join(', ') },
    { step: 8, title: 'Copy nội dung đã sinh → Paste vào Jira, sau đó nhập Jira Issue ID vào HiDesk để link 2 bên' },
  ];

  return {
    issueType,
    priority: JIRA_PRIORITY_MAP[ctx.priorityLevel],
    summary: ctx.title,
    description,
    labels,
    steps,
  };
}

function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}
