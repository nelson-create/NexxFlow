# Nexxflow

Nexxflow is a collaborative photo-sharing platform for photography and event teams. Admins create events, team members upload photos, and published customer galleries are protected by a PIN.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + React Router
- **Backend:** Node.js + Express + TypeScript
- **Database:** MongoDB with Prisma ORM
- **Storage:** Cloudinary image storage, with local filesystem and S3-compatible fallbacks
- **Auth:** JWT-based authentication with role-based access

## Project Structure

```
server/
  prisma/schema.prisma
  src/routes
  src/middleware
  src/services
client/
  src/pages
  src/contexts
  src/services
```

## Local Setup

1. Install dependencies:
   - `cd server && npm install`
   - `cd ../client && npm install`

2. Set up MongoDB and create database `nexxflow`.

3. Copy `server/.env.example` to `server/.env` and update `DATABASE_URL`.

4. Run migrations and seed data:
   - `cd server && npx prisma db push`
   - `npm run db:seed`

5. Start the backend:
   - `cd server && npm run dev`

6. Start the frontend:
   - `cd client && npm run dev`

## Demo Credentials

- Admin: `admin@nexxflow.com` / `admin123`
- Team Member: `member@nexxflow.com` / `member123`

## API Overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/events`
- `POST /api/events`
- `POST /api/photos/upload`
- `POST /api/galleries/publish`
- `POST /api/public-galleries/verify`

## Deployment

Deploy with Docker Compose:
```bash
cp .env.example .env
# Replace the placeholder MongoDB password and JWT secret in .env.
docker compose up --build
```

The client is available at `http://localhost:5173`. The Compose setup initializes
the Prisma schema after MongoDB is healthy, serves the API through the client
container, and persists local uploads in the `uploads_data` volume. For a
production deployment, set `CLIENT_URL` to the public origin, use strong unique
values for `MONGO_ROOT_PASSWORD` and `JWT_SECRET`, and prefer
`STORAGE_PROVIDER=s3` with the AWS-compatible settings in `server/.env.example`.

For Cloudinary image storage, set these server environment variables:

```env
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Uploaded image binaries are stored in Cloudinary. MongoDB stores the photo
metadata and Cloudinary storage key. Thumbnail URLs use Cloudinary image
transformations, so the server does not need to store a second thumbnail file.

Or deploy separately:
- Build and run the backend on a Node host with MongoDB
- Build and serve the frontend statically
- Configure object storage (S3-compatible) for production

## Known Limitations

- Local storage is used by default; configure S3 for production.
- Image processing requires `sharp` for thumbnails.
- Rate limiting and advanced security hardening are not included.
