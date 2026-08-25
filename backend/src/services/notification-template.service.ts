import { notificationTemplateRepository } from '../repositories/notification-template.repository';
import { ApiError } from '../utils/ApiError';

export async function listTemplates(isActive?: boolean) {
  return notificationTemplateRepository.findMany(isActive !== undefined ? { where: { isActive } } : undefined);
}

export async function getTemplate(key: string) {
  const template = await notificationTemplateRepository.findByKey(key);
  if (!template) throw ApiError.notFound('Template not found.');
  return template;
}

export async function createTemplate(input: { key: string; titleTemplate: string; bodyTemplate: string; type?: string; isActive?: boolean }) {
  const existing = await notificationTemplateRepository.findByKey(input.key);
  if (existing) throw ApiError.conflict('A template with this key already exists.');
  return notificationTemplateRepository.create(input);
}

export async function updateTemplate(key: string, input: { titleTemplate?: string; bodyTemplate?: string; type?: string; isActive?: boolean }) {
  await getTemplate(key);
  return notificationTemplateRepository.update(key, input);
}

export async function deleteTemplate(key: string) {
  await getTemplate(key);
  return notificationTemplateRepository.delete(key);
}
