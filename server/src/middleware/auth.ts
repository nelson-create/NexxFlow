import jwt from 'jsonwebtoken';
import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/appError.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: Role;
  };
}

export const authenticate = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, 'Authentication required');
  }

  let payload: { id: string };
  try {
    payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET!) as { id: string };
  } catch {
    throw new AppError(401, 'Your session has expired. Please sign in again.');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) {
    throw new AppError(401, 'Your session has expired. Please sign in again.');
  }

  req.user = user;
  next();
};

export const authorize = (...allowedRoles: Role[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(403, 'You do not have permission to do that');
    }

    next();
  };
};
