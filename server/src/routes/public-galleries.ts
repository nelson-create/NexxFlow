import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { rateLimit } from '../lib/rateLimit.js';
import { AppError } from '../utils/appError.js';

const router = Router();

const verifyPinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, 'must be exactly 6 digits'),
  slug: z.string().trim().min(1, 'is required'),
});

// A 6-digit PIN is only 1M combinations, so throttle guesses per client and gallery.
const pinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  key: (req) => `pin:${req.ip}:${String(req.body?.slug ?? '')}`,
});

router.post('/verify', pinLimiter, async (req, res, next) => {
  try {
    const { pin, slug } = verifyPinSchema.parse(req.body);
    const gallery = await prisma.gallery.findUnique({ where: { slug } });

    const validPin = gallery?.pinHash ? await bcrypt.compare(pin, gallery.pinHash) : !!gallery?.pin && gallery.pin === pin;
    if (!gallery || !gallery.publishedAt || !validPin) {
      throw new AppError(401, 'That PIN is incorrect or this gallery is no longer available');
    }

    const [event, photos] = await Promise.all([
      prisma.event.findUnique({ where: { id: gallery.eventId } }),
      prisma.photo.findMany({
        where: { eventId: gallery.eventId, selected: true },
        orderBy: { createdAt: 'desc' },
        select: { id: true, url: true, thumbnailUrl: true, originalName: true, createdAt: true },
      }),
    ]);

    if (!event) {
      throw new AppError(404, 'Gallery not found');
    }

    res.json({
      gallery: {
        id: gallery.id,
        slug: gallery.slug,
        eventName: event.name,
        description: event.description,
        publishedAt: gallery.publishedAt,
      },
      photos,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
