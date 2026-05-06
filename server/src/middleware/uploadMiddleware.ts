import multer from 'multer';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXT_BY_MIME: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(process.cwd(), 'uploads/avatars')),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${EXT_BY_MIME[file.mimetype] ?? '.bin'}`),
});

export const uploadAvatar = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error('UNSUPPORTED_MIME'));
  },
  limits: { fileSize: env.UPLOAD_MAX_BYTES, files: 1 },
}).single('avatar');
