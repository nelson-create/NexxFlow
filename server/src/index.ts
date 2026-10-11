import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from './lib/prisma.js';
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import photoRoutes from './routes/photos.js';
import galleryRoutes from './routes/galleries.js';
import publicGalleryRoutes from './routes/public-galleries.js';
import usersRoutes from './routes/users.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Behind the nginx container / a reverse proxy, use X-Forwarded-For so rate limits are per client.
app.set('trust proxy', 'loopback, linklocal, uniquelocal');
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')));

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/galleries', galleryRoutes);
app.use('/api/public-galleries', publicGalleryRoutes);
app.use('/api/users', usersRoutes);
app.use('/api', (_req, res) => res.status(404).json({ message: 'Not found' }));

app.use(errorHandler);

async function start() {
  await prisma.$connect();
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export { prisma, app, start };
