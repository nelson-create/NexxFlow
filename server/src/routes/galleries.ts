import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/appError.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = Router();

const pinSchema = z.string().regex(/^\d{6}$/, 'must be exactly 6 digits');
const publishSchema = z.object({ eventId: z.string(), pin: pinSchema.optional() });
const unpublishSchema = z.object({ eventId: z.string() });

const gallerySelect = { id: true, eventId: true, slug: true, publishedAt: true, createdAt: true, updatedAt: true };

router.use(authenticate, authorize('ADMIN'));

const findOwnedEvent = async (req: AuthRequest, eventId: string) => {
  const event = await prisma.event.findFirst({ where: { id: eventId, createdById: req.user!.id } });
  if (!event) throw new AppError(404, 'Event not found');
  return event;
};

const slugify = (name: string, id: string) => {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'gallery';
  return `${base}-${id.slice(-6)}`;
};

router.post('/publish', async (req: AuthRequest, res, next) => {
  try {
    const parsed = publishSchema.parse(req.body);
    const event = await findOwnedEvent(req, parsed.eventId);

    const selectedCount = await prisma.photo.count({ where: { eventId: event.id, selected: true } });
    if (!selectedCount) {
      throw new AppError(400, 'Select at least one photo before publishing');
    }

    const existing = await prisma.gallery.findUnique({ where: { eventId: event.id } });
    if (!parsed.pin && !existing?.pinHash) {
      throw new AppError(400, 'Pin: a 6-digit PIN is required the first time a gallery is published');
    }

    const pinHash = parsed.pin ? await bcrypt.hash(parsed.pin, 10) : existing!.pinHash;
    // Keep the slug stable across republishes so links already shared with customers keep working.
    const gallery = existing
      ? await prisma.gallery.update({
          where: { id: existing.id },
          data: { pinHash, pin: null, publishedAt: new Date() },
          select: gallerySelect,
        })
      : await prisma.gallery.create({
          data: { eventId: event.id, slug: slugify(event.name, event.id), pinHash, publishedAt: new Date() },
          select: gallerySelect,
        });

    await prisma.event.update({ where: { id: event.id }, data: { isPublished: true } });
    res.status(201).json({ ...gallery, accessPin: parsed.pin });
  } catch (err) {
    next(err);
  }
});

router.post('/unpublish', async (req: AuthRequest, res, next) => {
  try {
    const parsed = unpublishSchema.parse(req.body);
    const event = await findOwnedEvent(req, parsed.eventId);
    const gallery = await prisma.gallery.findUnique({ where: { eventId: event.id } });
    if (!gallery) {
      throw new AppError(404, 'This event has no gallery');
    }

    const updated = await prisma.gallery.update({ where: { id: gallery.id }, data: { publishedAt: null }, select: gallerySelect });
    await prisma.event.update({ where: { id: event.id }, data: { isPublished: false } });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.get('/by-event/:eventId', async (req: AuthRequest, res, next) => {
  try {
    const event = await findOwnedEvent(req, req.params.eventId as string);
    res.json(await prisma.gallery.findUnique({ where: { eventId: event.id }, select: gallerySelect }));
  } catch (err) {
    next(err);
  }
});

export default router;
