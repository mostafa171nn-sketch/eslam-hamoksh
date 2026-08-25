import type { Request, Response } from 'express';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notification.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';

export const listNotificationsHandler = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const result = await getNotifications(req.user!.id, page, limit);
  return ok(
    res,
    { notifications: result.notifications, unread: result.unread },
    'Notifications loaded.',
    {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
    },
  );
});

export const markReadHandler = asyncHandler(async (req: Request, res: Response) => {
  await markNotificationRead(req.user!.id, req.params.id);
  return ok(res, null, 'Notification marked as read.');
});

export const markAllReadHandler = asyncHandler(async (req: Request, res: Response) => {
  await markAllNotificationsRead(req.user!.id);
  return ok(res, null, 'All notifications marked as read.');
});
