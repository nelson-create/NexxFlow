import { Router } from 'express';
import { z } from 'zod';
import { Event } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/appError.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { deleteStoredObject } from '../services/storage.js';

const router = Router();

const eventFields = {
  name: z.string().trim().min(2, 'must be at least 2 characters').max(100),
  description: z.string().trim().max(500).optional(),
};
const createEventSchema = z.object({ ...eventFields, memberIds: z.array(z.string()).optional() });
const updateEventSchema = z.object({ name: eventFields.name.optional(), description: eventFields.description });
const membersSchema = z.object({ userIds: z.array(z.string()).min(1, 'select at least one member') });

const memberSelect = { id: true, name: true, email: true };

router.use(authenticate);

const getEventView = async (event: Event) => {
  const [members, photoCount, selectedCount, gallery, cover] = await Promise.all([
    event.memberIds.length
      ? prisma.user.findMany({ where: { id: { in: event.memberIds } }, select: memberSelect, orderBy: { name: 'asc' } })
      : Promise.resolve([]),
    prisma.photo.count({ where: { eventId: event.id } }),
    prisma.photo.count({ where: { eventId: event.id, selected: true } }),
    prisma.gallery.findUnique({ where: { eventId: event.id }, select: { id: true, slug: true, publishedAt: true } }),
    prisma.photo.findFirst({ where: { eventId: event.id }, orderBy: { createdAt: 'desc' }, select: { thumbnailUrl: true, url: true } }),
  ]);

  return {
    ...event,
    members,
    coverUrl: cover ? cover.thumbnailUrl || cover.url : null,
    _count: { photos: photoCount, selected: selectedCount },
    gallery,
  };
};

/** Events an admin owns. */
const findOwnedEvent = async (req: AuthRequest) => {
  const event = await prisma.event.findFirst({ where: { id: req.params.id as string, createdById: req.user!.id } });
  if (!event) throw new AppError(404, 'Event not found');
  return event;
};

/** Events the user owns or is assigned to. */
const findAccessibleEvent = async (req: AuthRequest) => {
  const event = await prisma.event.findFirst({
    where: { id: req.params.id as string, OR: [{ createdById: req.user!.id }, { memberIds: { has: req.user!.id } }] },
  });
  if (!event) throw new AppError(404, 'Event not found');
  return event;
};

const assertUsersExist = async (userIds: string[]) => {
  if (!userIds.length) return;
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true } });
  if (users.length !== new Set(userIds).size) {
    throw new AppError(404, 'One or more users not found');
  }
};

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const events = await prisma.event.findMany({
      where: req.user!.role === 'ADMIN' ? { createdById: req.user!.id } : { memberIds: { has: req.user!.id } },
      orderBy: { createdAt: 'desc' },
    });

    res.json(await Promise.all(events.map(getEventView)));
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const parsed = createEventSchema.parse(req.body);
    const memberIds = [...new Set(parsed.memberIds ?? [])];
    await assertUsersExist(memberIds);

    const event = await prisma.event.create({
      data: { name: parsed.name, description: parsed.description || null, createdById: req.user!.id, memberIds },
    });

    res.status(201).json(await getEventView(event));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    res.json(await getEventView(await findAccessibleEvent(req)));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const event = await findOwnedEvent(req);
    const parsed = updateEventSchema.parse(req.body);
    const updated = await prisma.event.update({
      where: { id: event.id },
      data: {
        ...(parsed.name !== undefined && { name: parsed.name }),
        ...(parsed.description !== undefined && { description: parsed.description || null }),
      },
    });
    res.json(await getEventView(updated));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const event = await findOwnedEvent(req);
    const photos = await prisma.photo.findMany({
      where: { eventId: event.id },
      select: { storageProvider: true, storageKey: true },
    });

    // Storage cleanup is best-effort: a missing remote object must not block deleting the event.
    await Promise.allSettled(photos.map((photo) => deleteStoredObject(photo.storageProvider, photo.storageKey)));

    await prisma.gallery.deleteMany({ where: { eventId: event.id } });
    await prisma.photo.deleteMany({ where: { eventId: event.id } });
    await prisma.event.delete({ where: { id: event.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post('/:id/members', authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const event = await findOwnedEvent(req);
    const { userIds } = membersSchema.parse(req.body);
    await assertUsersExist(userIds);

    const memberIds = [...new Set([...event.memberIds, ...userIds])];
    await prisma.event.update({ where: { id: event.id }, data: { memberIds } });

    res.json(await prisma.user.findMany({ where: { id: { in: memberIds } }, select: memberSelect, orderBy: { name: 'asc' } }));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/members/:userId', authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const event = await findOwnedEvent(req);
    const memberIds = event.memberIds.filter((id) => id !== req.params.userId);
    await prisma.event.update({ where: { id: event.id }, data: { memberIds } });

    res.json(
      memberIds.length
        ? await prisma.user.findMany({ where: { id: { in: memberIds } }, select: memberSelect, orderBy: { name: 'asc' } })
        : [],
    );
  } catch (err) {
    next(err);
  }
});

export default router;
