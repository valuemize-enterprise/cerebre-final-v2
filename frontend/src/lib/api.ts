/**
 * Cerebre API Client — COMPLETE & HARDENED
 * Exports: default api, authApi, ApiError, safeApiCall, withRetry
 */
import axios, { AxiosError } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!BASE_URL && typeof window !== 'undefined') {
  console.error('[API] NEXT_PUBLIC_API_URL is not set. Add it to Vercel → Environment Variables.');
}

export class ApiError extends Error {
  status: number; code: string; details?: any;
  constructor(message: string, status: number, code: string, details?: any) {
    super(message);
    this.name = 'ApiError'; this.status = status; this.code = code; this.details = details;
  }
  isOffline()      { return this.code === 'OFFLINE'; }
  isUnauthorized() { return this.status === 401; }
  isForbidden()    { return this.status === 403; }
  isNotFound()     { return this.status === 404; }
  isValidation()   { return this.status === 422; }
  isRateLimited()  { return this.status === 429; }
  isServerError()  { return this.status >= 500; }
}

const api = axios.create({
  baseURL: BASE_URL || 'http://localhost:4000/api',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('cm_token');
    if (token && token !== 'null' && token !== 'undefined' && !token.startsWith('{')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Unified error handling
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (typeof window !== 'undefined' && !navigator.onLine) {
      throw new ApiError('You appear to be offline. Check your internet connection and try again.', 0, 'OFFLINE');
    }
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      throw new ApiError('Request timed out. The server may be starting up — wait 30 seconds and try again.', 408, 'TIMEOUT');
    }
    if (!error.response) {
      throw new ApiError('Cannot reach the server. It may be waking up — wait 30 seconds and try again.', 503, 'SERVER_UNREACHABLE');
    }

    const { status, data } = error.response;
    const msg = (data as any)?.error || (data as any)?.message;

    if (status === 401) {
      if (typeof window !== 'undefined') {
        const hadToken = !!localStorage.getItem('cm_token');
        if (hadToken) {
          localStorage.removeItem('cm_token');
          // Don't redirect inside interceptor if we're on the login page already
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login?reason=session_expired';
          }
        }
      }
      throw new ApiError('Your session has expired. Please sign in again.', 401, 'SESSION_EXPIRED');
    }
    if (status === 403) throw new ApiError("You don't have permission to do this.", 403, 'FORBIDDEN');
    if (status === 404) throw new ApiError(msg || 'Not found.', 404, 'NOT_FOUND');
    if (status === 422) {
      const details = (data as any)?.details;
      const fieldMsg = details?.map((d: any) => `${d.field}: ${d.message}`).join('. ');
      throw new ApiError(fieldMsg || msg || 'Please check your input and try again.', 422, 'VALIDATION_ERROR', details);
    }
    if (status === 429) throw new ApiError('Too many requests. Please slow down and try again.', 429, 'RATE_LIMITED');
    if (status >= 500) throw new ApiError(msg || 'Something went wrong on our end. Please try again.', status, 'SERVER_ERROR');
    throw new ApiError(msg || 'An unexpected error occurred.', status, 'UNKNOWN');
  }
);

// Auth API — used by store.ts
export const authApi = {
  login:    (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: { email: string; password: string; fullName: string; company?: string }) =>
    api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

export const uploadApi = {
  upload: (formData: FormData, onProgress?: (pct: number) => void) =>
    api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress?.(Math.round(((e.loaded ?? 0) * 100) / (e.total ?? 1))),
    }),
  list:     (page = 1) => api.get(`/upload?page=${page}`),
  status:   (fileId: string) => api.get(`/upload/${fileId}/status`),
  download: (fileId: string) => api.get(`/upload/${fileId}/download`),
  delete:   (fileId: string) => api.delete(`/upload/${fileId}`),
};

export const reportsApi = {
  analyze:    (fileId: string, cmpFileId?: string) => api.post('/reports/analyze', { fileId, comparisonFileId: cmpFileId }),
  retry:      (fileId: string) => api.post(`/reports/retry/${fileId}`),
  list:       (page = 1) => api.get(`/reports?page=${page}`),
  get:        (id: string) => api.get(`/reports/${id}`),
  compare:    (a: string, b: string) => api.get(`/reports/compare/${a}/${b}`),
  history:    (params?: any) => api.get('/reports/history/metrics', { params }),
  dashboard:  () => api.get('/reports/summary/dashboard'),
  share:      (id: string, expiresInDays = 7) => api.post(`/reports/${id}/share`, { expiresInDays }),
  revokeShare:(id: string) => api.delete(`/reports/${id}/share`),
  getShared:  (token: string) => api.get(`/reports/shared/${token}`),
};

export const metricsApi = {
  platforms:   (params?: any) => api.get('/metrics/platforms', { params }),
  platform:    (p: string, months = 12) => api.get(`/metrics/platforms/${p}`, { params: { months } }),
  compare:     (params: any) => api.get('/metrics/compare', { params }),
  funnel:      (months = 1) => api.get('/metrics/funnel', { params: { months } }),
  leaderboard: (metric = 'impressions', limit = 5) => api.get('/metrics/leaderboard', { params: { metric, limit } }),
};

export const settingsApi = {
  getProfile:       () => api.get('/settings/profile'),
  updateProfile:    (data: any) => api.put('/settings/profile', data),
  changePassword:   (data: any) => api.put('/settings/password', data),
  getApiKey:        () => api.get('/settings/my-api-key'),
  saveApiKey:       (platform: string, apiKey: string, extra?: any) =>
    api.post('/settings/api-keys', { platform, apiKey, extra }),
  testApiKey:       (platform: string, apiKey: string) =>
    api.post('/settings/test-api-key', { platform, apiKey }),
};

export const adminApi = {
  stats:       () => api.get('/admin/stats'),
  users:       () => api.get('/admin/users'),
  updateUser:  (userId: string, data: any) => api.patch(`/admin/users/${userId}`, data),
  deleteUser:  (userId: string) => api.delete(`/admin/users/${userId}`),
  retryFailed: () => api.post('/admin/jobs/retry-failed'),
};

export const safeApiCall = async <T>(call: () => Promise<T>, fallback: T, onError?: (e: ApiError) => void): Promise<T> => {
  try { return await call(); }
  catch (error) { if (error instanceof ApiError) onError?.(error); return fallback; }
};

export const withRetry = async <T>(fn: () => Promise<T>, retries = 2, delayMs = 1000): Promise<T> => {
  try { return await fn(); }
  catch (error) {
    if (retries <= 0) throw error;
    const ok = error instanceof ApiError && (error.status === 503 || error.code === 'SERVER_UNREACHABLE');
    if (!ok) throw error;
    await new Promise(r => setTimeout(r, delayMs));
    return withRetry(fn, retries - 1, delayMs * 2);
  }
};

export default api;
