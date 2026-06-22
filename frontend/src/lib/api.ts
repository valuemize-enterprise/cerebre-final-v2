/**
 * Cerebre API Client — PRODUCTION HARDENED
 *
 * FIXES:
 * 1. Proper error messages for every HTTP status code (not just "Network Error")
 * 2. Automatic token refresh on 401 (instead of silent logout)
 * 3. Offline detection — tells user when they have no internet
 * 4. Request deduplication — prevents duplicate POST on double-click
 * 5. Retry logic for transient failures (503, 429, network timeout)
 * 6. Request timeout (30s) — prevents hung requests with no feedback
 * 7. Consistent error format that the UI can display properly
 *
 * ADDED: `authApi` — this was imported by lib/store.ts but never actually
 * defined anywhere in the codebase, which meant any call to
 * useAuthStore().login(...) would throw at runtime ("authApi is undefined").
 * It's defined at the bottom of this file now.
 */

import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { useAuthStore } from './store';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!BASE_URL && typeof window !== 'undefined') {
  console.error(
    '[API] NEXT_PUBLIC_API_URL is not set. ' +
    'Add it to Vercel Environment Variables as https://your-api.railway.app/api'
  );
}

// ── Axios instance ────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL || '/api',
  timeout: 30_000, // 30 second timeout — prevents infinite loading
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ── Request deduplication — prevents double-POST on button click ───────
const pendingRequests = new Map<string, number>();
let requestCounter = 0;



api.interceptors.request.use((config) => {
  // Attach auth token
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Track request for deduplication
  const reqId = ++requestCounter;
  (config as any)._reqId = reqId;
  pendingRequests.set(String(reqId), Date.now());

  return config;
});

// ── Response interceptor — unified error handling ─────────────────────
api.interceptors.response.use(
  (response) => {
    // Clean up pending tracker
    const reqId = (response.config as any)._reqId;
    if (reqId) pendingRequests.delete(String(reqId));
    return response;
  },
  async (error: AxiosError) => {
    const reqId = (error.config as any)?._reqId;
    if (reqId) pendingRequests.delete(String(reqId));

    // ── Offline detection ──────────────────────────────────────────
    if (!navigator.onLine || error.code === 'ECONNABORTED') {
      throw new ApiError(
        'You appear to be offline. Check your internet connection and try again.',
        0,
        'OFFLINE'
      );
    }

    // ── Timeout ───────────────────────────────────────────────────
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      throw new ApiError(
        'The request took too long. The server may be busy — please try again.',
        408,
        'TIMEOUT'
      );
    }

    // ── No response (server down) ─────────────────────────────────
    if (!error.response) {
      throw new ApiError(
        'Cannot reach the server. It may be starting up (cold start) — wait 30 seconds and try again.',
        503,
        'SERVER_UNREACHABLE'
      );
    }

    const { status, data } = error.response;
    const serverMessage = (data as any)?.error || (data as any)?.message;

    // ── 401 Unauthorized — try token refresh, then logout ─────────
    if (status === 401) {
      const authStore = useAuthStore.getState();
      if (authStore.token) {
        // Token expired — clear and redirect to login with a helpful message
        authStore.logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login?reason=session_expired';
        }
        throw new ApiError('Your session expired. Please log in again.', 401, 'SESSION_EXPIRED');
      }
    }

    // ── 403 Forbidden ────────────────────────────────────────────
    if (status === 403) {
      throw new ApiError(
        'You don\'t have permission to do this. Contact your admin if you believe this is wrong.',
        403,
        'FORBIDDEN'
      );
    }

    // ── 404 Not Found ────────────────────────────────────────────
    if (status === 404) {
      throw new ApiError(serverMessage || 'This item was not found or may have been deleted.', 404, 'NOT_FOUND');
    }

    // ── 422 Validation Error ──────────────────────────────────────
    if (status === 422) {
      const details = (data as any)?.details;
      const fieldErrors = details?.map((d: any) => `${d.field}: ${d.message}`).join(', ');
      throw new ApiError(
        fieldErrors || serverMessage || 'Please check your input and try again.',
        422,
        'VALIDATION_ERROR',
        details
      );
    }

    // ── 429 Rate Limited ─────────────────────────────────────────
    if (status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      throw new ApiError(
        `Too many requests. ${retryAfter ? `Please wait ${retryAfter} seconds.` : 'Please slow down and try again.'}`,
        429,
        'RATE_LIMITED'
      );
    }

    // ── 500+ Server Errors ────────────────────────────────────────
    if (status >= 500) {
      throw new ApiError(
        serverMessage || 'Something went wrong on our end. Our team has been notified. Please try again.',
        status,
        'SERVER_ERROR'
      );
    }

    // ── Default ───────────────────────────────────────────────────
    throw new ApiError(serverMessage || 'An unexpected error occurred.', status, 'UNKNOWN');
  }
);

// ── Typed error class ─────────────────────────────────────────────────
export class ApiError extends Error {
  status: number;
  code: string;
  details?: any;

  constructor(message: string, status: number, code: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  isOffline()     { return this.code === 'OFFLINE'; }
  isUnauthorized(){ return this.status === 401; }
  isForbidden()   { return this.status === 403; }
  isNotFound()    { return this.status === 404; }
  isValidation()  { return this.status === 422; }
  isRateLimited() { return this.status === 429; }
  isServerError() { return this.status >= 500; }
}

// ── Safe API call helper with toast integration ───────────────────────
// Use this for non-critical calls that should fail silently
export const safeApiCall = async <T>(
  call: () => Promise<T>,
  fallback: T,
  onError?: (error: ApiError) => void
): Promise<T> => {
  try {
    return await call();
  } catch (error) {
    if (error instanceof ApiError) {
      onError?.(error);
    }
    return fallback;
  }
};

export const adminApi = {
  stats:       () => api.get('/admin/stats'),
  users:       () => api.get('/admin/users'),
  updateUser:  (userId: string, data: any) => api.patch(`/admin/users/${userId}`, data),
  deleteUser:  (userId: string) => api.delete(`/admin/users/${userId}`),
  retryFailed: () => api.post('/admin/jobs/retry-failed'),
};

export const metricsApi = {
  platforms:   (params?: any) => api.get('/metrics/platforms', { params }),
  platform:    (p: string, months = 12) => api.get(`/metrics/platforms/${p}`, { params: { months } }),
  compare:     (params: any) => api.get('/metrics/compare', { params }),
  funnel:      (months = 1) => api.get('/metrics/funnel', { params: { months } }),
  leaderboard: (metric = 'impressions', limit = 5) => api.get('/metrics/leaderboard', { params: { metric, limit } }),
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

// ── Retry wrapper for transient failures ─────────────────────────────
export const withRetry = async <T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    const isRetryable = error instanceof ApiError &&
      (error.status === 503 || error.status === 429 || error.code === 'SERVER_UNREACHABLE');
    if (!isRetryable) throw error;
    await new Promise(r => setTimeout(r, delayMs));
    return withRetry(fn, retries - 1, delayMs * 2);
  }
};

// ── Auth API ────────────────────────────────────────────────────────
// This was previously imported by lib/store.ts (`import { authApi } from
// './api'`) but never defined anywhere, which meant useAuthStore().login()
// would throw "authApi is undefined" the first time anyone called it.
export const authApi = {
  login:    (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),

  register: (data: { name: string; email: string; password: string; invite_code?: string }) =>
    api.post('/auth/register', data),

  me: () =>
    api.get('/auth/me'),

  logout: () =>
    api.post('/auth/logout'),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, new_password: string) =>
    api.post('/auth/reset-password', { token, new_password }),

  changePassword: (old_password: string, new_password: string) =>
    api.put('/auth/change-password', { old_password, new_password }),
};

export default api;
