import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { parsePagination, paginated } from '../../utils/pagination';
import { PRIORITY_LEVELS, TICKET_STATUSES } from '../../domain/types';
import {
  bulkAction,
  changeStatus,
  createTicket,
  findDuplicates,
  getTicketDetail,
  listTickets,
  setAssignees,
  updateTicket,
} from './ticket.service';
import { buildJiraGuide, linkJiraIssue } from './jira.controller';

const router = Router();
router.use(authenticate);

const priorityEnum = z.enum(PRIORITY_LEVELS as [string, ...string[]]);
const statusEnum = z.enum(TICKET_STATUSES as [string, ...string[]]);

/**
 * @openapi
 * /api/tickets:
 *   get: { tags: [Tickets], summary: Danh sách ticket (scoped theo quyền, filter, search, pagination) }
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = parsePagination(req);
    const { items, total } = await listTickets(
      req.user!,
      {
        status: req.query.status as string,
        priority: req.query.priority as string,
        projectId: req.query.projectId as string,
        orgId: req.query.orgId as string,
        ownerId: req.query.ownerId as string,
        templateId: req.query.templateId as string,
        search: req.query.search as string,
        tag: req.query.tag as string,
      },
      page
    );
    res.json(paginated(items, total, page));
  })
);

const createSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(20000).optional(),
  templateId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid(),
  priorityLevel: priorityEnum.optional(),
  category: z.string().max(120).optional(),
  customerId: z.string().uuid().nullable().optional(),
  fields: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

router.post(
  '/',
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const ticket = await createTicket(req.user!, req.body);
    res.status(201).json(ticket);
  })
);

/** Duplicate detection before submit. */
router.post(
  '/check-duplicate',
  validateBody(z.object({ projectId: z.string().uuid(), title: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const dups = await findDuplicates(req.user!, req.body.projectId, req.body.title);
    res.json({ duplicates: dups });
  })
);

/** Bulk action. */
router.post(
  '/bulk',
  validateBody(
    z.object({
      ticketIds: z.array(z.string().uuid()).min(1),
      action: z.object({
        status: statusEnum.optional(),
        ownerId: z.string().uuid().nullable().optional(),
        priorityLevel: priorityEnum.optional(),
      }),
    })
  ),
  asyncHandler(async (req, res) => {
    const results = await bulkAction(req.user!, req.body.ticketIds, req.body.action);
    res.json({ results });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await getTicketDetail(req.user!, req.params.id));
  })
);

const updateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(20000).optional(),
  priorityLevel: priorityEnum.optional(),
  ownerId: z.string().uuid().nullable().optional(),
  category: z.string().max(120).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

router.patch(
  '/:id',
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    res.json(await updateTicket(req.user!, req.params.id, req.body));
  })
);

router.post(
  '/:id/status',
  validateBody(
    z.object({
      status: statusEnum,
      note: z.string().max(2000).optional(),
      meta: z.record(z.any()).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    res.json(await changeStatus(req.user!, req.params.id, req.body));
  })
);

/** Set collaborating dev assignees (multiple devs per issue). */
router.put(
  '/:id/assignees',
  validateBody(z.object({ userIds: z.array(z.string().uuid()) })),
  asyncHandler(async (req, res) => {
    res.json(await setAssignees(req.user!, req.params.id, req.body.userIds));
  })
);

/** Jira Auto Guide (step-by-step generator). */
router.get('/:id/jira-guide', asyncHandler(buildJiraGuide));

/** Link a Jira issue id/url back to the ticket. */
router.post(
  '/:id/jira-link',
  validateBody(z.object({ jiraIssueId: z.string().min(1), jiraIssueUrl: z.string().url().optional() })),
  asyncHandler(linkJiraIssue)
);

export default router;
