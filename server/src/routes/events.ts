import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/appError';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { deleteStoredObject } from '../services/storage';

const router = Router();
const prisma = new PrismaClient();

const createEventSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
});

const memberSelect = {
  id: true,
  name: true,
  email: true,
};

router.use(authenticate);

const getEventView = async (event: Awaited<ReturnType<typeof prisma.event.findFirst>>) => {
  if (!event) {
    return null;
  }

  const [members, photoCount, gallery] = await Promise.all([
    event.memberIds.length
      ? prisma.user.findMany({ where: { id: { in: event.memberIds } }, select: memberSelect })
      : Promise.resolve([]),
    prisma.photo.count({ where: { eventId: event.id } }),
    prisma.gallery.findUnique({
      where: { eventId: event.id },
      select: { id: true, slug: true, publishedAt: true },
    }),
  ]);

  return {
    ...event,
    members,
    _count: { photos: photoCount },
    gallery,
  };
};

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const events = await prisma.event.findMany({
      where: req.user!.role === 'ADMIN' ? { createdById: req.user!.id } : { memberIds: { has: req.user!.id } },
      orderBy: { createdAt: 'desc' },
    });

    res.json(await Promise.all(events.map((event) => getEventView(event))));
  } catch (err) {
    next(err);
  }
});

router.post('/', authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const parsed = createEventSchema.parse(req.body);
    const memberIds = parsed.memberIds ?? [];

    if (memberIds.length) {
      const users = await prisma.user.findMany({ where: { id: { in: memberIds } }, select: { id: true } });
      if (users.length !== new Set(memberIds).size) {
        throw new AppError(404, 'One or more users not found');
      }
    }

    const event = await prisma.event.create({
      data: {
        name: parsed.name,
        description: parsed.description,
        createdById: req.user!.id,
        memberIds,
      },
    });

    res.status(201).json(await getEventView(event));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const event = await prisma.event.findFirst({
      where: { id: req.params.id as string, createdById: req.user!.id },
    });

    if (!event) {
      throw new AppError(404, 'Event not found');
    }

    res.json(await getEventView(event));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const event = await prisma.event.findFirst({
      where: { id: req.params.id as string, createdById: req.user!.id },
    });
    if (!event) {
      throw new AppError(404, 'Event not found');
    }

    const photos = await prisma.photo.findMany({
      where: { eventId: event.id },
      select: { storageProvider: true, storageKey: true },
    });

    for (const photo of photos) {
      await deleteStoredObject(photo.storageProvider, photo.storageKey);
    }

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
    const event = await prisma.event.findFirst({
      where: { id: req.params.id as string, createdById: req.user!.id },
    });
    if (!event) {
      throw new AppError(404, 'Event not found');
    }

    const { userIds } = req.body as { userIds?: string[] };
    if (!userIds?.length) {
      throw new AppError(400, 'userIds is required');
    }

    const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true } });
    if (users.length !== new Set(userIds).size) {
      throw new AppError(404, 'One or more users not found');
    }

    const memberIds = [...new Set([...event.memberIds, ...userIds])];
    await prisma.event.update({ where: { id: event.id }, data: { memberIds } });

    const members = await prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: memberSelect,
    });

    res.json(members);
  } catch (err) {
    next(err);
  }
});

export default router;
