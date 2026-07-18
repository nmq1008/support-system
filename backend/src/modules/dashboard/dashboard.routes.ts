import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { getDashboard } from './dashboard.service';

const router = Router();
router.use(authenticate);

/** Manager Dashboard — staff & customer_admin only. */
router.get(
  '/',
  requireRole('super_admin', 'csm', 'dev_lead', 'dev', 'gate', 'customer_admin'),
  asyncHandler(async (req, res) => {
    const data = await getDashboard(req.user!, {
      orgId: req.query.orgId as string,
      projectId: req.query.projectId as string,
      ownerId: req.query.ownerId as string,
      priority: req.query.priority as string,
      from: req.query.from as string,
      to: req.query.to as string,
    });
    res.json(data);
  })
);

export default router;
