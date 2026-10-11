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

Open http://localhost:5173. In dev mode the sign-in page has one-click demo account buttons.

## Demo Credentials

- Admin: `admin@nexxflow.com` / `admin123`
- Team Member: `member@nexxflow.com` / `member123`

Public sign-up always creates **team members**. Admin accounts are created by the
seed script (or by changing a user's `role` to `ADMIN` in the database).

## Workflow

1. **Admin** creates an event at `/events` and assigns team members.
2. **Team members** open the event and drag-and-drop photos onto it (batched uploads with progress).
3. **Admin** ticks the photos to deliver (or uses *Select all*), then publishes the client gallery with a 6-digit PIN.
4. **Client** opens `/gallery/<slug>`, enters the PIN, and browses or downloads photos.
   The link stays the same across republishes; the admin can change the PIN or unpublish at any time.

## App Routes

| Route | Who | Purpose |
| --- | --- | --- |
| `/login`, `/register` | Guests | Sign in / create a team-member account |
| `/events` | Signed in | Event list (admins: owned events, members: assigned events) |
| `/events/:id` | Signed in | Upload, curate, manage team, publish gallery |
| `/gallery/access` | Public | Enter a gallery link + PIN |
| `/gallery/:slug` | Public | PIN-protected client gallery |

## API Overview

| Method & path | Access |
| --- | --- |
| `POST /api/auth/register`, `POST /api/auth/login` | Public (rate limited) |
| `GET /api/auth/me` | Signed in |
| `GET /api/events`, `GET /api/events/:id` | Owner or assigned member |
| `POST /api/events`, `PATCH /api/events/:id`, `DELETE /api/events/:id` | Admin owner |
| `POST /api/events/:id/members`, `DELETE /api/events/:id/members/:userId` | Admin owner |
| `GET /api/photos?eventId=`, `POST /api/photos/upload` | Owner or assigned member |
| `PATCH /api/photos/:id`, `PATCH /api/photos/bulk` | Admin owner (gallery selection) |
| `DELETE /api/photos/:id` | Admin owner, or the member who uploaded it |
| `POST /api/galleries/publish`, `POST /api/galleries/unpublish`, `GET /api/galleries/by-event/:eventId` | Admin owner |
| `POST /api/public-galleries/verify` | Public (10 PIN attempts / 15 min per client) |
| `GET /api/users?role=TEAM_MEMBER` | Admin |

Validation errors return `400` with a readable `message`.

## Deployment

### Option A: single server with Docker Compose (recommended)

On any Linux VPS with Docker installed:
```bash
git clone <your-repo-url> nexxflow && cd nexxflow
cp .env.example .env
# Set MONGO_ROOT_PASSWORD, JWT_SECRET (openssl rand -hex 32), CLIENT_URL and DOMAIN in .env.
docker compose --profile https up -d --build
```

The `https` profile starts Caddy on ports 80/443, which obtains a TLS certificate
for `DOMAIN` automatically. Point the domain's DNS A record at the server first,
and set `CLIENT_URL=https://<DOMAIN>`. Without the profile (`docker compose up -d --build`)
the client is available over plain HTTP at `http://<host>:5173`.

The Compose setup initializes the Prisma schema after MongoDB is healthy, serves
the API through the client container (the API port is not published to the host),
and persists local uploads in the `uploads_data` volume — back up both `db_data`
and `uploads_data`. To update: `git pull && docker compose --profile https up -d --build`.

To create the first admin on a live server (instead of seeding the default
`admin123` account), sign up through the app, then promote that account:
```bash
docker compose exec db bash -c 'mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin nexxflow --eval "db.User.updateOne({email: \"you@example.com\"}, {\$set: {role: \"ADMIN\"}})"'
```

Storage settings (`STORAGE_PROVIDER`, `CLOUDINARY_*`, `AWS_*`) in the root `.env`
are passed through to the server container.

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

### Option B: managed hosts (Atlas + Render/Railway + Vercel/Netlify)

1. **Database:** create a MongoDB Atlas cluster (Atlas clusters are replica sets, which Prisma requires) and copy its connection string.
2. **API:** deploy `server/` with its Dockerfile on Render, Railway or Fly.io. Set
   `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL` (the frontend's URL, used for CORS),
   and `STORAGE_PROVIDER=cloudinary` (or `s3`) with its credentials. Don't use
   `local` storage here: these hosts have ephemeral disks, and `/uploads` URLs
   would point at the frontend's origin. The container runs `prisma db push` on start.
3. **Frontend:** deploy `client/` on Vercel or Netlify (build command `npm run build`,
   output `dist`) with `VITE_API_URL=https://<your-api-host>/api` set at build time.
   `client/vercel.json` and `client/public/_redirects` provide the SPA fallback so
   routes like `/gallery/:slug` load on refresh.

## Known Limitations

- Local storage is used by default; configure Cloudinary or S3 for production.
- With local/S3 storage, thumbnails require the optional `sharp` package; without it the original image is used.
- Rate limiting is in-memory, so limits are per server instance.
