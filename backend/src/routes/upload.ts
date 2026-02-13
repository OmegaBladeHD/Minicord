import fs from 'fs';
import path from 'path';
import { Request, Response, Router } from 'express';
import multer from 'multer';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { env } from '../config/env.js';
import { authMiddleware } from '../middleware/auth.js';

fs.mkdirSync(env.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req: unknown, _file: unknown, cb: (error: Error | null, destination: string) => void) => cb(null, env.uploadDir),
  filename: (_req: unknown, file: { originalname: string }, cb: (error: Error | null, filename: string) => void) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

export const uploadRouter = Router();
uploadRouter.use(authMiddleware);

type UploadRequest = Request & { file?: { filename: string } };

uploadRouter.post('/', upload.single('file'), (req: UploadRequest, res: Response) => {
  if (!req.file) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'file is required' });
  }

  const fileUrl = `${env.clientUrl.replace(':5173', ':4000')}/uploads/${req.file.filename}`;
  return res.status(HTTP_STATUS.CREATED).json({ url: fileUrl, filename: req.file.filename });
});
