import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/appError';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { deleteStoredObject, upload, uploadToLocal, uploadToS3, uploadToCloudinary, cloudinaryThumbnailUrl, generateThumbnail } from '../services/storage';

const router = Router();
const prisma = new PrismaClient();

const uploadSchema = z.object({
  eventId: z.string(),
});

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

router.use(authenticate);

router.post('/upload', authorize('ADMIN', 'TEAM_MEMBER'), upload.array('photos'), async (req: AuthRequest, res, next) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    const { eventId } = req.body;
    const parsed = uploadSchema.parse({ eventId });

    const event = await prisma.event.findFirst({
      where: { id: parsed.eventId, OR: [{ createdById: req.user!.id }, { memberIds: { has: req.user!.id } }] },
    });
    if (!event) {
      throw new AppError(404, 'Event not found');
    }

    if (!files?.length) {
      throw new AppError(400, 'No files uploaded');
    }

    const created: any[] = [];
    for (const file of files) {
      const storageProvider = process.env.STORAGE_PROVIDER || 'local';
      const upload = storageProvider === 'cloudinary' ? uploadToCloudinary : storageProvider === 's3' ? uploadToS3 : uploadToLocal;
      const result = await upload(file, parsed.eventId);
      const thumbnailUrl = storageProvider === 'cloudinary' ? cloudinaryThumbnailUrl(result.storageKey) : await generateThumbnail(file.buffer) || result.url;

      const photo = await prisma.photo.create({
        data: {
          eventId: parsed.eventId,
          uploadedById: req.user!.id,
          filename: result.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url: result.url,
          storageProvider,
          storageKey: result.storageKey,
          thumbnailUrl,
          width: null,
          height: null,
          selected: false,
        },
      });

      created.push(photo);
    }

    res.status(201).json(created);
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
      const event = await prisma.event.findFirst({
        where: { id: eventId, OR: [{ createdById: req.user!.id }, { memberIds: { has: req.user!.id } }] },
      });
      if (!event) {
        throw new AppError(404, 'Event not found');
      }
      where.eventId = eventId as string;
    } else {
      const events = await prisma.event.findMany({
        where: { OR: [{ createdById: req.user!.id }, { memberIds: { has: req.user!.id } }] },
        select: { id: true },
      });
      where.eventId = { in: events.map((event) => event.id) };
    }

    if (uploadedByMe) {
      where.uploadedById = req.user!.id;
    }

    const photos = await prisma.photo.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: photoSelect,
    });

    const uploadedByIds = [...new Set(photos.map((photo) => photo.uploadedById))];
    const users = uploadedByIds.length
      ? await prisma.user.findMany({
          where: { id: { in: uploadedByIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const usersById = new Map(users.map((user) => [user.id, user]));

    res.json(
      photos.map((photo) => ({
        ...photo,
        uploadedBy: usersById.get(photo.uploadedById)!,
      })),
    );
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const photo = await prisma.photo.findUnique({ where: { id: req.params.id as string } });
    if (!photo) {
      throw new AppError(404, 'Photo not found');
    }

    const event = await prisma.event.findFirst({
      where: { id: photo.eventId, createdById: req.user!.id },
    });
    if (!event) {
      throw new AppError(403, 'Not allowed');
    }

    const selected = typeof (req.body as any).selected === 'boolean' ? (req.body as any).selected : true;
    const updated = await prisma.photo.update({
      where: { id: req.params.id as string },
      data: { selected },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const photo = await prisma.photo.findUnique({ where: { id: req.params.id as string } });
    if (!photo) {
      throw new AppError(404, 'Photo not found');
    }

    const event = await prisma.event.findFirst({
      where: { id: photo.eventId, createdById: req.user!.id },
    });
    if (!event) {
      throw new AppError(403, 'Not allowed');
    }

    await deleteStoredObject(photo.storageProvider, photo.storageKey);
    await prisma.photo.delete({ where: { id: photo.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
