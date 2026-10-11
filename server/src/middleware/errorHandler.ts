import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { AppError } from '../utils/appError.js';

const fieldLabel = (path: (string | number)[]) => {
  const field = String(path[path.length - 1] ?? '');
  return field ? field.charAt(0).toUpperCase() + field.slice(1) : 'Input';
};

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  if (err instanceof ZodError) {
    const issue = err.issues[0];
    return res.status(400).json({ message: `${fieldLabel(issue.path)}: ${issue.message}`, issues: err.issues });
  }

  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Each image must be smaller than 15 MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'You can upload up to 50 images at a time.' });
    }
    return res.status(400).json({ message: err.message });
  }

  if (err.message === 'Unsupported file type') {
    return res.status(400).json({ message: 'Only JPEG, PNG, WebP, and HEIC images are supported.' });
  }

  if ((err as { type?: string }).type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Malformed JSON body' });
  }

  const providerError = err as Error & { http_code?: number };
  if (providerError.http_code === 401 || providerError.http_code === 403 || err.message.toLowerCase().includes('cloudinary')) {
    console.error('Storage provider error:', err.message);
    return res.status(502).json({ message: 'Image storage rejected the upload. Check the server storage configuration.' });
  }

  // Prisma: malformed ObjectId-style ids etc. should not surface as 500s.
  if ((err as { code?: string }).code === 'P2023') {
    return res.status(404).json({ message: 'Not found' });
  }

  console.error('Unexpected error:', err);
  return res.status(500).json({ message: 'Something went wrong on our side. Please try again.' });
};
