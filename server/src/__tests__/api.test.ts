import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app, prisma } from '../index';

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const adminEmail = `test-admin-${suffix}@example.com`;
const memberEmail = `test-member-${suffix}@example.com`;
const outsiderEmail = `test-outsider-${suffix}@example.com`;

let adminId = '';
let memberId = '';
let outsiderId = '';
let assignedEventId = '';
let privateEventId = '';
let selectedPhotoId = '';
let unselectedPhotoId = '';
let adminToken = '';
let memberToken = '';

const login = async (email: string, password: string) => {
  const response = await request(app).post('/api/auth/login').send({ email, password });
  expect(response.status).toBe(200);
  return response.body.token as string;
};

describe('Nexxflow API requirements', () => {
  beforeAll(async () => {
    const password = await bcrypt.hash('TestPass123!', 10);
    const [admin, member, outsider] = await Promise.all([
      prisma.user.create({ data: { email: adminEmail, name: 'Test Admin', password, role: 'ADMIN' } }),
      prisma.user.create({ data: { email: memberEmail, name: 'Test Member', password, role: 'TEAM_MEMBER' } }),
      prisma.user.create({ data: { email: outsiderEmail, name: 'Test Outsider', password, role: 'TEAM_MEMBER' } }),
    ]);
    adminId = admin.id;
    memberId = member.id;
    outsiderId = outsider.id;

    const [assignedEvent, privateEvent] = await Promise.all([
      prisma.event.create({ data: { name: 'Assigned test event', description: '', createdById: adminId, memberIds: [memberId] } }),
      prisma.event.create({ data: { name: 'Private test event', description: '', createdById: adminId, memberIds: [] } }),
    ]);
    assignedEventId = assignedEvent.id;
    privateEventId = privateEvent.id;

    const [selectedPhoto, unselectedPhoto] = await Promise.all([
      prisma.photo.create({
        data: {
          eventId: assignedEventId,
          uploadedById: adminId,
          filename: 'selected.jpg',
          originalName: 'selected.jpg',
          mimeType: 'image/jpeg',
          size: 10,
          url: 'https://example.com/selected.jpg',
          selected: true,
        },
      }),
      prisma.photo.create({
        data: {
          eventId: assignedEventId,
          uploadedById: adminId,
          filename: 'unselected.jpg',
          originalName: 'unselected.jpg',
          mimeType: 'image/jpeg',
          size: 10,
          url: 'https://example.com/unselected.jpg',
          selected: false,
        },
      }),
    ]);
    selectedPhotoId = selectedPhoto.id;
    unselectedPhotoId = unselectedPhoto.id;

    adminToken = await login(adminEmail, 'TestPass123!');
    memberToken = await login(memberEmail, 'TestPass123!');
  });

  afterAll(async () => {
    await prisma.gallery.deleteMany({ where: { eventId: { in: [assignedEventId, privateEventId] } } });
    await prisma.photo.deleteMany({ where: { id: { in: [selectedPhotoId, unselectedPhotoId] } } });
    await prisma.event.deleteMany({ where: { id: { in: [assignedEventId, privateEventId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, memberId, outsiderId] } } });
    await prisma.$disconnect();
  });

  it('authenticates valid users and rejects invalid credentials', async () => {
    const valid = await request(app).post('/api/auth/login').send({ email: memberEmail, password: 'TestPass123!' });
    expect(valid.status).toBe(200);
    expect(valid.body.user.role).toBe('TEAM_MEMBER');

    const invalid = await request(app).post('/api/auth/login').send({ email: memberEmail, password: 'wrong-password' });
    expect(invalid.status).toBe(401);
  });

  it('enforces role authorization for gallery publishing', async () => {
    const response = await request(app)
      .post('/api/galleries/publish')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ eventId: assignedEventId, pin: '482917' });

    expect(response.status).toBe(403);
  });

  it('limits event and photo access to assigned users', async () => {
    const assigned = await request(app)
      .get(`/api/photos?eventId=${assignedEventId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(assigned.status).toBe(200);
    expect(assigned.body).toHaveLength(2);

    const outsiderToken = await login(outsiderEmail, 'TestPass123!');
    const denied = await request(app)
      .get(`/api/photos?eventId=${assignedEventId}`)
      .set('Authorization', `Bearer ${outsiderToken}`);
    expect(denied.status).toBe(404);
  });

  it('publishes selected photos and verifies the gallery PIN', async () => {
    const publish = await request(app)
      .post('/api/galleries/publish')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ eventId: assignedEventId, pin: '482917' });

    expect(publish.status).toBe(201);
    expect(publish.body.accessPin).toBe('482917');
    expect(publish.body.pin).toBeUndefined();

    const wrongPin = await request(app).post('/api/public-galleries/verify').send({ slug: publish.body.slug, pin: '111111' });
    expect(wrongPin.status).toBe(401);

    const correctPin = await request(app).post('/api/public-galleries/verify').send({ slug: publish.body.slug, pin: '482917' });
    expect(correctPin.status).toBe(200);
    expect(correctPin.body.photos.map((photo: { id: string }) => photo.id)).toEqual([selectedPhotoId]);
  });

  it('rejects access to an unpublished gallery', async () => {
    const response = await request(app)
      .post('/api/public-galleries/verify')
      .send({ slug: `private-${privateEventId}`, pin: '482917' });

    expect(response.status).toBe(401);
  });
});
