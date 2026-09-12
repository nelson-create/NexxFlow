import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/appError';

const router = Router();
const prisma = new PrismaClient();

const verifyPinSchema = z.object({ pin: z.string().length(6), slug: z.string() });

router.post('/verify', async (req, res, next) => {
  try {
    const { pin, slug } = verifyPinSchema.parse(req.body);
    const gallery = await prisma.gallery.findUnique({ where: { slug } });

    const validPin = gallery?.pinHash
      ? await bcrypt.compare(pin, gallery.pinHash)
      : gallery?.pin === pin;
    if (!gallery || !gallery.publishedAt || !validPin) {
      throw new AppError(401, 'Invalid PIN or gallery unavailable');
    }

    const [event, photos] = await Promise.all([
      prisma.event.findUnique({ where: { id: gallery.eventId } }),
      prisma.photo.findMany({
        where: { eventId: gallery.eventId, selected: true },
        orderBy: { createdAt: 'desc' },
        select: { id: true, url: true, originalName: true, createdAt: true },
      }),
    ]);

    if (!event) {
      throw new AppError(404, 'Event not found');
    }

    res.json({
      gallery: { id: gallery.id, slug: gallery.slug, eventName: event.name },
      photos,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
