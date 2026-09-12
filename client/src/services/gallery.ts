import api from './api';

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string, role?: string) => api.post('/auth/register', { name, email, password, role }),
};

export const eventApi = {
  list: () => api.get('/events'),
  create: (payload: { name: string; description?: string; memberIds?: string[] }) => api.post('/events', payload),
  get: (id: string) => api.get(`/events/${id}`),
  remove: (id: string) => api.delete(`/events/${id}`),
  addMembers: (id: string, userIds: string[]) => api.post(`/events/${id}/members`, { userIds }),
  publish: (payload: { eventId: string; pin: string }) => api.post('/galleries/publish', payload),
  getByEvent: (eventId: string) => api.get(`/galleries/by-event/${eventId}`),
};

export const photoApi = {
  upload: (eventId: string, files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append('photos', file));
    form.append('eventId', eventId);
    return api.post('/photos/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  list: (params: { eventId?: string; uploadedByMe?: boolean }) => api.get('/photos', { params }),
  update: (id: string, data: { selected?: boolean }) => api.patch(`/photos/${id}`, data),
  remove: (id: string) => api.delete(`/photos/${id}`),
};

export const publicGalleryApi = {
  verify: (slug: string, pin: string) => api.post('/public-galleries/verify', { slug, pin }),
};
