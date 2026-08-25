import type { Request, Response } from 'express';
import {
  getMessages,
  getOrCreateConversation,
  listConversations,
  sendMessage,
  unreadCount,
} from '../services/chat.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';

export const listConversationsHandler = asyncHandler(async (req: Request, res: Response) => {
  const conversations = await listConversations(req.user!);
  return ok(res, conversations);
});

export const unreadHandler = asyncHandler(async (req: Request, res: Response) => {
  const count = await unreadCount(req.user!);
  return ok(res, { unread: count });
});

export const getOrCreateHandler = asyncHandler(async (req: Request, res: Response) => {
  const { counterpartId } = req.validatedBody as any;
  const conversation = await getOrCreateConversation(req.user!, counterpartId);
  return ok(res, { conversationId: conversation.id });
});

export const messagesHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.validatedParams as any;
  const messages = await getMessages(req.user!, id);
  return ok(res, messages);
});

export const sendHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.validatedParams as any;
  const { body } = req.validatedBody as any;
  const message = await sendMessage(req.user!, id, body);
  return ok(res, message);
});
