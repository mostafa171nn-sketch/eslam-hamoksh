import type { Request, Response } from 'express';
import {
  deleteDocument,
  getDocument,
  listDocuments,
  rejectDocument,
  updateDocument,
  uploadDocument,
  verifyDocument,
} from '../services/document.service';
import { fileUrl } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';
import { paginationMeta } from '../utils/response';

export const listHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await listDocuments(
    { userId: req.user!.id, role: req.user!.role },
    {
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
      type: req.query.type as string | undefined,
      ownerId: req.query.ownerId as string | undefined,
      page: Number(req.query.page ?? 1),
      limit: Number(req.query.limit ?? 25),
    },
  );
  return ok(res, result.data, 'Documents loaded.', paginationMeta(result.page, result.limit, result.total));
});

export const getHandler = asyncHandler(async (req: Request, res: Response) => {
  const doc = await getDocument({ userId: req.user!.id, role: req.user!.role }, req.params.id);
  return ok(res, doc, 'Document loaded.');
});

export const uploadHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validatedBody ?? req.body;
  const doc = await uploadDocument(
    { userId: req.user!.id, role: req.user!.role },
    {
      title: body.title,
      description: body.description,
      type: body.type,
      fileUrl: req.file ? fileUrl(req.file.filename) ?? req.file.filename : body.fileUrl,
      mimeType: req.file?.mimetype,
      fileSize: req.file?.size,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    },
  );
  return created(res, doc, 'Document uploaded.');
});

export const updateHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validatedBody ?? req.body;
  const doc = await updateDocument(
    { userId: req.user!.id, role: req.user!.role },
    req.params.id,
    { title: body.title, description: body.description, type: body.type },
  );
  return ok(res, doc, 'Document updated.');
});

export const deleteHandler = asyncHandler(async (req: Request, res: Response) => {
  await deleteDocument({ userId: req.user!.id, role: req.user!.role }, req.params.id);
  return ok(res, null, 'Document deleted.');
});

export const verifyHandler = asyncHandler(async (req: Request, res: Response) => {
  const doc = await verifyDocument({ userId: req.user!.id, role: req.user!.role }, req.params.id);
  return ok(res, doc, 'Document approved.');
});

export const rejectHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const doc = await rejectDocument(
    { userId: req.user!.id, role: req.user!.role },
    req.params.id,
    body.reason,
  );
  return ok(res, doc, 'Document rejected.');
});
