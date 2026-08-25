import { Router } from 'express';
import {
  getOrCreateHandler,
  listConversationsHandler,
  messagesHandler,
  sendHandler,
  unreadHandler,
} from '../controllers/chat.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { requireFeature } from '../middleware/feature-guard';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const conversationIdSchema = z.object({ id: z.string().uuid('Invalid conversation id.') });
const startSchema = z.object({ counterpartId: z.string().uuid('Invalid teacher/student id.') });
const messageSchema = z.object({ body: z.string().trim().min(1, 'Message cannot be empty.').max(5000) });

export const chatRoutes = Router();

// Chat is only available when the center plan includes it.
chatRoutes.use(authenticate, requireRole('TEACHER', 'STUDENT'), requireFeature('chat'));

chatRoutes.get('/conversations', listConversationsHandler);
chatRoutes.get('/unread', unreadHandler);
chatRoutes.post('/conversations', validate(startSchema), getOrCreateHandler);
chatRoutes.get('/conversations/:id/messages', validate(conversationIdSchema, 'params'), messagesHandler);
chatRoutes.post('/conversations/:id/messages', validate(conversationIdSchema, 'params'), validate(messageSchema), sendHandler);
