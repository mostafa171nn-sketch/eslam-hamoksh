import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { env } from '../config/env';

const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
fs.mkdirSync(uploadRoot, { recursive: true });

const MIME_WHITELIST: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
  ],
};

const EXTENSION_WHITELIST = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.md',
]);

const isAllowedFile = (mimetype: string, originalname: string) => {
  const mimeOk = Object.values(MIME_WHITELIST).some((list) => list.includes(mimetype));
  const ext = path.extname(originalname).toLowerCase();
  return mimeOk && EXTENSION_WHITELIST.has(ext);
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, name);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!isAllowedFile(file.mimetype, file.originalname)) {
      const err = new Error('File type is not allowed.') as Error & { isFileTypeError?: boolean };
      err.isFileTypeError = true;
      return cb(err);
    }
    cb(null, true);
  },
});

export const uploadRootPath = uploadRoot;

/** URL path prefix used to expose uploaded files. */
export const UPLOADS_URL = '/uploads';

/** Returns a public URL for a stored filename (relative to the API origin). */
export function fileUrl(filename: string | null | undefined): string | null {
  if (!filename) return null;
  if (/^https?:\/\//.test(filename)) return filename;
  return `${UPLOADS_URL}/${filename}`;
}
