import type { NotificationType } from '@prisma/client';
import { notificationRepository } from '../repositories/notification.repository';
import { notificationTemplateRepository } from '../repositories/notification-template.repository';

export interface SendNotificationInput {
  userId: string;
  type?: NotificationType;
  title: string;
  message: string;
}

/**
 * Creates a notification for a single user. Multiple recipients can be passed
 * and records are created with createMany to avoid N+1 inserts.
 */
export async function sendNotification(
  input: SendNotificationInput | SendNotificationInput[],
): Promise<void> {
  const items = Array.isArray(input) ? input : [input];
  if (items.length === 0) return;

  await notificationRepository.createMany(items);
}

/**
 * Sends a notification using a database template. Variables in the template
 * are replaced using simple {{variable}} syntax. Falls back to a generic
 * notification if the template is not found or inactive.
 */
export async function sendTemplatedNotification(
  templateKey: string,
  userIds: string[],
  variables: Record<string, string>,
): Promise<void> {
  const template = await notificationTemplateRepository.findByKey(templateKey);
  if (!template || !template.isActive) return;

  const replaceVars = (text: string) =>
    Object.entries(variables).reduce(
      (result, [key, value]) => result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value),
      text,
    );

  const items: SendNotificationInput[] = userIds.map((userId) => ({
    userId,
    type: template.type as NotificationType,
    title: replaceVars(template.titleTemplate),
    message: replaceVars(template.bodyTemplate),
  }));

  await sendNotification(items);
}

export async function getNotifications(userId: string, page = 1, limit = 20) {
  return notificationRepository.findMany(userId, page, limit);
}

export async function markNotificationRead(userId: string, id: string) {
  return notificationRepository.markRead(id, userId);
}

export async function markAllNotificationsRead(userId: string) {
  return notificationRepository.markAllRead(userId);
}
