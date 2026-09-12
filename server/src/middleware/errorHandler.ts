import { AppError } from '../utils/appError';
import { NextFunction, Request, Response } from 'express';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  const providerError = err as Error & { http_code?: number };
  const uploadError = err as Error & { code?: string };
  if (uploadError.code === 'LIMIT_FILE_SIZE' || err.message.includes('File size too large')) {
    return res.status(400).json({ message: 'Each image must be smaller than 10 MB.' });
  }
  if (err.message === 'Unsupported file type') {
    return res.status(400).json({ message: 'Only JPEG, PNG, WebP, and HEIC images are supported.' });
  }

  if (providerError.http_code === 401 || providerError.http_code === 403 || err.message.toLowerCase().includes('cloudinary')) {
    console.error('Storage provider error:', err.message);
    return res.status(502).json({ message: 'Image storage provider rejected the upload. Check the server storage configuration.' });
  }

  console.error('Unexpected error:', err);
  return res.status(500).json({ message: 'Internal server error' });
};
