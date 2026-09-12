import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticate, authorize('ADMIN'), async (req: AuthRequest, res) => {
  res.json(await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true } }));
});

export default router;
