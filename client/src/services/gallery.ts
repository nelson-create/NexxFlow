import { AxiosProgressEvent } from 'axios';
import api from './api';
import type { EventItem, GallerySummary, Member, Photo, PublicGalleryData, User } from '../lib/types';

export const authApi = {
  login: (email: string, password: string) => api.post<{ token: string; user: User }>('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/register', { name, email, password }),
  me: () => api.get<User>('/auth/me'),
};

export const userApi = {
  list: (role?: User['role']) => api.get<User[]>('/users', { params: role ? { role } : undefined }),
};

export const eventApi = {
  list: () => api.get<EventItem[]>('/events'),
  create: (payload: { name: string; description?: string; memberIds?: string[] }) => api.post<EventItem>('/events', payload),
  get: (id: string) => api.get<EventItem>(`/events/${id}`),
  update: (id: string, payload: { name?: string; description?: string }) => api.patch<EventItem>(`/events/${id}`, payload),
  remove: (id: string) => api.delete(`/events/${id}`),
  addMembers: (id: string, userIds: string[]) => api.post<Member[]>(`/events/${id}/members`, { userIds }),
  removeMember: (id: string, userId: string) => api.delete<Member[]>(`/events/${id}/members/${userId}`),
};

export const galleryApi = {
  publish: (eventId: string, pin?: string) =>
    api.post<GallerySummary & { accessPin?: string }>('/galleries/publish', { eventId, ...(pin ? { pin } : {}) }),
  unpublish: (eventId: string) => api.post<GallerySummary>('/galleries/unpublish', { eventId }),
  getByEvent: (eventId: string) => api.get<GallerySummary | null>(`/galleries/by-event/${eventId}`),
};

export const photoApi = {
  upload: (eventId: string, files: File[], onUploadProgress?: (event: AxiosProgressEvent) => void) => {
    const form = new FormData();
    form.append('eventId', eventId);
    files.forEach((file) => form.append('photos', file));
    return api.post<Photo[]>('/photos/upload', form, { onUploadProgress });
  },
  list: (params: { eventId?: string; uploadedByMe?: boolean }) => api.get<Photo[]>('/photos', { params }),
  update: (id: string, data: { selected: boolean }) => api.patch<Photo>(`/photos/${id}`, data),
  bulkSelect: (eventId: string, ids: string[], selected: boolean) =>
    api.patch<{ updated: number }>('/photos/bulk', { eventId, ids, selected }),
  remove: (id: string) => api.delete(`/photos/${id}`),
};

export const publicGalleryApi = {
  verify: (slug: string, pin: string) => api.post<PublicGalleryData>('/public-galleries/verify', { slug, pin }),
};
