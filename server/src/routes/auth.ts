import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { rateLimit } from '../lib/rateLimit.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../utils/appError.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, 'must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('must be a valid email address'),
  password: z.string().min(6, 'must be at least 6 characters').max(128),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('must be a valid email address'),
  password: z.string().min(1, 'is required'),
});

const publicUser = { id: true, name: true, email: true, role: true } as const;

const signToken = (id: string, email: string) =>
  jwt.sign({ id, email }, process.env.JWT_SECRET!, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  key: (req) => `auth:${req.ip}:${String(req.body?.email ?? '').toLowerCase()}`,
});

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: parsed.email } });
    if (existing) {
      throw new AppError(409, 'An account with this email already exists');
    }

    // Public sign-up always creates team members; admins are provisioned separately.
    const password = await bcrypt.hash(parsed.password, 10);
    const user = await prisma.user.create({
      data: { name: parsed.name, email: parsed.email, password, role: Role.TEAM_MEMBER },
      select: publicUser,
    });

    res.status(201).json({ token: signToken(user.id, user.email), user });
  } catch (err) {
    next(err);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: parsed.email } });
    const valid = user ? await bcrypt.compare(parsed.password, user.password) : false;
    if (!user || !valid) {
      throw new AppError(401, 'Incorrect email or password');
    }

    res.json({
      token: signToken(user.id, user.email),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, (req: AuthRequest, res) => {
  res.json(req.user);
});

export default router;
