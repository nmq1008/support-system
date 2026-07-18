import axios from 'axios';

const TOKEN_KEY = 'hidesk_token';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY);
      if (!location.pathname.startsWith('/login')) location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export function setToken(token: string) { localStorage.setItem(TOKEN_KEY, token); }
export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

/** Extract a friendly message from an axios error. */
export function apiError(err: unknown, fallback = 'Đã có lỗi xảy ra'): string {
  const anyErr = err as { response?: { data?: { error?: { message?: string } } } };
  return anyErr?.response?.data?.error?.message || fallback;
}
