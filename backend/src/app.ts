import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { healthcheck } from './config/db';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/error';
import { openapiSpec } from './swagger';

import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import orgRoutes from './modules/orgs/org.routes';
import projectRoutes from './modules/projects/project.routes';
import ticketRoutes from './modules/tickets/ticket.routes';
import commentRoutes from './modules/comments/comment.routes';
import reviewRoutes from './modules/reviews/review.routes';
import templateRoutes from './modules/templates/template.routes';
import tagRoutes from './modules/tags/tag.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import slaRoutes from './modules/admin/sla.routes';
import reportRoutes from './modules/reports/report.routes';
import attachmentRoutes from './modules/attachments/attachment.routes';

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Static uploads
  app.use('/uploads', express.static(path.resolve(env.uploadDir)));

  // Health
  app.get('/health', async (_req, res) => {
    const db = await healthcheck();
    res.status(db ? 200 : 503).json({ status: db ? 'ok' : 'degraded', db });
  });

  // Swagger
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
  app.get('/api/openapi.json', (_req, res) => res.json(openapiSpec));

  // Rate limiting on the API surface
  app.use('/api', apiLimiter);

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/orgs', orgRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/tickets', commentRoutes); // /:ticketId/comments
  app.use('/api/tickets', reviewRoutes); // /:ticketId/reviews
  app.use('/api/templates', templateRoutes);
  app.use('/api/tags', tagRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin/sla', slaRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api', attachmentRoutes); // /tickets/:ticketId/attachments

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
