import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const role = req.query.role === 'ADMIN' || req.query.role === 'TEAM_MEMBER' ? req.query.role : undefined;
    res.json(
      await prisma.user.findMany({
        where: role ? { role } : undefined,
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: 'asc' },
      }),
    );
  } catch (err) {
    next(err);
  }
});

export default router;
