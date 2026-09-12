import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/appError';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const publishSchema = z.object({ eventId: z.string(), pin: z.string().length(6) });

router.use(authenticate, authorize('ADMIN'));

router.post('/publish', async (req: AuthRequest, res, next) => {
  try {
    const parsed = publishSchema.parse(req.body);
    const event = await prisma.event.findFirst({
      where: { id: parsed.eventId, createdById: req.user!.id },
    });
    if (!event) {
      throw new AppError(404, 'Event not found');
    }

    const selectedPhotos = await prisma.photo.findMany({
      where: { eventId: event.id, selected: true },
      select: { id: true },
    });
    if (!selectedPhotos.length) {
      throw new AppError(400, 'Select photos before publishing');
    }

    const slug = `${event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}-${event.id.slice(-6)}`;
    const pinHash = await bcrypt.hash(parsed.pin, 10);
    const gallery = await prisma.gallery.upsert({
      where: { eventId: event.id },
      create: { eventId: event.id, slug, pinHash, publishedAt: new Date() },
      update: { slug, pinHash, publishedAt: new Date() },
    });

    await prisma.event.update({ where: { id: event.id }, data: { isPublished: true } });
    res.status(201).json({ ...gallery, pin: undefined, accessPin: parsed.pin });
  } catch (err) {
    next(err);
  }
});

router.get('/by-event/:eventId', async (req: AuthRequest, res, next) => {
  try {
    const event = await prisma.event.findFirst({ where: { id: req.params.eventId as string, createdById: req.user!.id } });
    if (!event) {
      throw new AppError(404, 'Event not found');
    }
    const gallery = await prisma.gallery.findUnique({
      where: { eventId: event.id },
      select: { id: true, eventId: true, slug: true, publishedAt: true, createdAt: true, updatedAt: true },
    });
    if (!gallery) {
      res.json(null);
      return;
    }
    res.json(gallery);
  } catch (err) {
    next(err);
  }
});

export default router;
