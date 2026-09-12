import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DeleteObjectCommand, S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v2 as cloudinary } from 'cloudinary';

export type UploadResult = {
  filename: string;
  url: string;
  storageKey: string;
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadDirectory = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

export const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  },
});

export const uploadToLocal = async (file: Express.Multer.File, eventId: string): Promise<UploadResult> => {
  const ext = path.extname(file.originalname);
  const filename = `${uuidv4()}${ext}`;
  const relativePath = path.join(eventId, filename);
  const fullPath = path.join(uploadDirectory, relativePath);

  const fs = await import('fs');
  await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.promises.writeFile(fullPath, file.buffer);

  return { filename, url: `/uploads/${relativePath.replace(/\\/g, '/')}`, storageKey: relativePath.replace(/\\/g, '/') };
};

export const uploadToS3 = async (file: Express.Multer.File, eventId: string): Promise<UploadResult> => {
  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });

  const ext = path.extname(file.originalname);
  const filename = `${eventId}/${uuidv4()}${ext}`;
  const key = `photos/${filename}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );

  const base = process.env.AWS_S3_ENDPOINT ? `${process.env.AWS_S3_ENDPOINT}/${process.env.AWS_S3_BUCKET}` : `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`;
  return { filename, url: `${base}/${key}`, storageKey: key };
};

export const uploadToCloudinary = (file: Express.Multer.File, eventId: string): Promise<UploadResult> =>
  new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      reject(new Error('Cloudinary is enabled but CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET is missing'));
      return;
    }

    const publicId = `nexxflow/events/${eventId}/${uuidv4()}`;
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, resource_type: 'image' },
      (error, result) => {
        if (error || !result) {
          reject(new Error(`Cloudinary upload failed: ${error?.message || 'no upload result returned'}`));
          return;
        }
        resolve({ filename: result.public_id, url: result.secure_url, storageKey: result.public_id });
      },
    );
    stream.end(file.buffer);
  });

export const cloudinaryThumbnailUrl = (storageKey: string) =>
  cloudinary.url(storageKey, {
    secure: true,
    resource_type: 'image',
    transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto', fetch_format: 'auto' }],
  });

export const deleteStoredObject = async (provider: string | null, storageKey: string | null) => {
  if (!storageKey) return;

  if (provider === 'cloudinary') {
    await cloudinary.uploader.destroy(storageKey, { resource_type: 'image', invalidate: true });
    return;
  }

  if (provider === 's3') {
    const s3 = new S3Client({
      region: process.env.AWS_REGION,
      endpoint: process.env.AWS_S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
    await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: storageKey }));
    return;
  }

  const fs = await import('fs');
  const fullPath = path.resolve(uploadDirectory, storageKey);
  const rootPath = path.resolve(uploadDirectory);
  if (!fullPath.startsWith(`${rootPath}${path.sep}`)) {
    throw new Error('Invalid local storage key');
  }
  await fs.promises.rm(fullPath, { force: true });
};

export const generateThumbnail = async (buffer: Buffer) => {
  try {
    const sharp = await import('sharp');
    const filename = `thumb-${Date.now()}.jpg`;
    const out = path.join(uploadDirectory, 'thumbnails', filename);

    const fs = await import('fs');
    await fs.promises.mkdir(path.dirname(out), { recursive: true });
    await sharp.default(buffer).resize(400).jpeg({ quality: 70 }).toFile(out);

    return `/uploads/${path.join('thumbnails', filename).replace(/\\/g, '/')}`;
  } catch {
    return '';
  }
};
