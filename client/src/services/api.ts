import axios, { AxiosError } from 'axios';

export const TOKEN_KEY = 'token';
export const SESSION_EXPIRED_EVENT = 'nexxflow:session-expired';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const url = error.config?.url ?? '';
    const isAuthAttempt = url.startsWith('/auth/login') || url.startsWith('/auth/register');
    if (error.response?.status === 401 && error.config?.headers?.Authorization && !isAuthAttempt) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  },
);

/** Best human-readable message for a failed request. */
export const errorMessage = (error: unknown, fallback = 'Something went wrong. Please try again.') => {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
    if (!error.response) return 'Cannot reach the server. Check your connection and try again.';
    if (error.response.status === 413) return 'Those files are too large to upload in one go.';
  }
  return fallback;
};

export default api;
