import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/appError.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { deleteStoredObject, upload, uploadToLocal, uploadToS3, uploadToCloudinary, cloudinaryThumbnailUrl, generateThumbnail } from '../services/storage.js';

const router = Router();

const uploadSchema = z.object({ eventId: z.string().min(1, 'is required') });
const updateSchema = z.object({ selected: z.boolean() });
const bulkSchema = z.object({ eventId: z.string(), ids: z.array(z.string()).min(1).max(1000), selected: z.boolean() });

const photoSelect = {
  id: true,
  eventId: true,
  uploadedById: true,
  filename: true,
  originalName: true,
  mimeType: true,
  size: true,
  url: true,
  storageProvider: true,
  storageKey: true,
  thumbnailUrl: true,
  selected: true,
  createdAt: true,
};

const accessibleEventWhere = (userId: string) => ({ OR: [{ createdById: userId }, { memberIds: { has: userId } }] });

const withUploaders = async <T extends { uploadedById: string }>(photos: T[]) => {
  const ids = [...new Set(photos.map((photo) => photo.uploadedById))];
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } }) : [];
  const byId = new Map(users.map((user) => [user.id, user]));
  return photos.map((photo) => ({
    ...photo,
    uploadedBy: byId.get(photo.uploadedById) ?? { id: photo.uploadedById, name: 'Former member', email: '' },
  }));
};

/** Runs `fn` over `items` with at most `limit` in flight, preserving order. */
const mapLimit = async <T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) => {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await fn(items[index]);
      }
    }),
  );
  return results;
};

router.use(authenticate);

router.post('/upload', authorize('ADMIN', 'TEAM_MEMBER'), upload.array('photos', 50), async (req: AuthRequest, res, next) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    const parsed = uploadSchema.parse({ eventId: req.body.eventId });

    const event = await prisma.event.findFirst({ where: { id: parsed.eventId, ...accessibleEventWhere(req.user!.id) } });
    if (!event) {
      throw new AppError(404, 'Event not found');
    }
    if (!files?.length) {
      throw new AppError(400, 'No files uploaded');
    }

    const storageProvider = process.env.STORAGE_PROVIDER || 'local';
    const store = storageProvider === 'cloudinary' ? uploadToCloudinary : storageProvider === 's3' ? uploadToS3 : uploadToLocal;

    const created = await mapLimit(files, 4, async (file) => {
      const result = await store(file, event.id);
      const thumbnailUrl =
        storageProvider === 'cloudinary' ? cloudinaryThumbnailUrl(result.storageKey) : (await generateThumbnail(file.buffer)) || result.url;

      return prisma.photo.create({
        data: {
          eventId: event.id,
          uploadedById: req.user!.id,
          filename: result.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url: result.url,
          storageProvider,
          storageKey: result.storageKey,
          thumbnailUrl,
          selected: false,
        },
        select: photoSelect,
      });
    });

    res.status(201).json(await withUploaders(created));
  } catch (err) {
    next(err);
  }
});

router.get('/', authorize('ADMIN', 'TEAM_MEMBER'), async (req: AuthRequest, res, next) => {
  try {
    const eventId = String(req.query.eventId || '');
    const uploadedByMe = String(req.query.uploadedByMe || 'false') === 'true';

    const where: Record<string, unknown> = {};
    if (eventId) {
      const event = await prisma.event.findFirst({ where: { id: eventId, ...accessibleEventWhere(req.user!.id) } });
      if (!event) {
        throw new AppError(404, 'Event not found');
      }
      where.eventId = eventId;
    } else {
      const events = await prisma.event.findMany({ where: accessibleEventWhere(req.user!.id), select: { id: true } });
      where.eventId = { in: events.map((event) => event.id) };
    }

    if (uploadedByMe) {
      where.uploadedById = req.user!.id;
    }

    const photos = await prisma.photo.findMany({ where, orderBy: { createdAt: 'desc' }, select: photoSelect });
    res.json(await withUploaders(photos));
  } catch (err) {
    next(err);
  }
});

router.patch('/bulk', authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const parsed = bulkSchema.parse(req.body);
    const event = await prisma.event.findFirst({ where: { id: parsed.eventId, createdById: req.user!.id } });
    if (!event) {
      throw new AppError(404, 'Event not found');
    }

    const result = await prisma.photo.updateMany({
      where: { id: { in: parsed.ids }, eventId: event.id },
      data: { selected: parsed.selected },
    });
    res.json({ updated: result.count });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { selected } = updateSchema.parse(req.body);
    const photo = await prisma.photo.findUnique({ where: { id: req.params.id as string } });
    if (!photo) {
      throw new AppError(404, 'Photo not found');
    }

    const event = await prisma.event.findFirst({ where: { id: photo.eventId, createdById: req.user!.id } });
    if (!event) {
      throw new AppError(403, 'You do not have permission to do that');
    }

    res.json(await prisma.photo.update({ where: { id: photo.id }, data: { selected }, select: photoSelect }));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authorize('ADMIN', 'TEAM_MEMBER'), async (req: AuthRequest, res, next) => {
  try {
    const photo = await prisma.photo.findUnique({ where: { id: req.params.id as string } });
    if (!photo) {
      throw new AppError(404, 'Photo not found');
    }

    // Event owners can delete anything; members can delete only their own uploads to events they still belong to.
    const event = await prisma.event.findFirst({ where: { id: photo.eventId, ...accessibleEventWhere(req.user!.id) } });
    const isOwner = event?.createdById === req.user!.id;
    const isUploader = !!event && photo.uploadedById === req.user!.id;
    if (!isOwner && !isUploader) {
      throw new AppError(403, 'You do not have permission to do that');
    }

    await deleteStoredObject(photo.storageProvider, photo.storageKey).catch((err) =>
      console.error('Failed to delete stored object', photo.storageKey, err),
    );
    await prisma.photo.delete({ where: { id: photo.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
