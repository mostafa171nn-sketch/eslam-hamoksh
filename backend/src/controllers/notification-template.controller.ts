import type { Request, Response } from 'express';
import * as templateService from '../services/notification-template.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';

export const listTemplatesHandler = asyncHandler(async (req: Request, res: Response) => {
  const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
  const templates = await templateService.listTemplates(isActive);
  return ok(res, templates, 'Notification templates loaded.');
});

export const getTemplateHandler = asyncHandler(async (req: Request, res: Response) => {
  const template = await templateService.getTemplate(req.params.key);
  return ok(res, template, 'Template loaded.');
});

export const createTemplateHandler = asyncHandler(async (req: Request, res: Response) => {
  const template = await templateService.createTemplate(req.validatedBody);
  return created(res, template, 'Template created.');
});

export const updateTemplateHandler = asyncHandler(async (req: Request, res: Response) => {
  const template = await templateService.updateTemplate(req.params.key, req.validatedBody);
  return ok(res, template, 'Template updated.');
});

export const deleteTemplateHandler = asyncHandler(async (req: Request, res: Response) => {
  await templateService.deleteTemplate(req.params.key);
  return ok(res, null, 'Template deleted.');
});
