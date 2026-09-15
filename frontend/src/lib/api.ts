import type { PublicTeacher, TeacherProfile, User } from './types';

const BASE = '/api';

/** Hard cap for every API call so a stalled backend can never block the UI. */
export const REQUEST_TIMEOUT_MS = 20_000;
/** Abort errors surface as network failures with a clear message. */
import { getFormatLang } from './format';
export function timeoutMessage(): string {
  return getFormatLang() === 'ar'
    ? 'استغرق الخادم وقتًا طويلاً للرد. يرجى المحاولة مرة أخرى.'
    : 'The server took too long to respond. Please try again.';
}
export const TIMEOUT_MESSAGE = timeoutMessage();

// --- Multi-tenant center types --------------------------------------------

export interface Center {
  id: string;
  name: string;
  slug: string;
  status: string;
  subscriptionStatus: string;
  requiresApproval: boolean;
}

export interface LoginResult {
  user: User;
  center: Center | null;
}

export interface RegisterResult {
  user: User;
  studentNumber?: string;
}

/** Response of POST /auth/otp/verify for a REGISTER_* purpose. */
export interface RegisterVerificationResult {
  purpose: string;
  role: string | null;
  loggedIn: boolean;
  studentId?: string;
  studentNumber?: string;
  teacherId?: string;
  parentId?: string;
  centerId?: string;
  centerName?: string;
  status?: string;
  subscriptionStatus?: string;
  requiresApproval?: boolean;
  locationStatus?: string;
}

/** Response of POST /auth/otp/request|resend. */
export interface OtpRequestResult {
  verificationId: string;
  maskedPhone: string;
  expiresAt: string;
  resendCooldown: number;
  devOtp?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
  centerId?: string;
}

export interface RegisterPayload {
  role: 'TEACHER' | 'STUDENT' | 'PARENT' | 'ADMIN' | 'CENTER_ADMIN';
  username: string;
  fullName: string;
  email?: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  centerId?: string;
  subjects?: string[];
  grades?: string[];
  gradeId?: string;
  yearsExperience?: number;
  hourlyRate?: number;
}

export interface PublicCenterSubject {
  id: string;
  name: string;
}

export interface PublicCenterTeacher {
  id: string;
  userId: string;
  fullName: string;
  photo?: string | null;
  bio?: string | null;
  subjects: PublicCenterSubject[];
  grades?: PublicCenterSubject[];
  yearsExperience?: number;
  hourlyRate?: number;
  rating?: number;
  ratingCount?: number;
}

export interface PublicCenter {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  photoUrl?: string | null;
  teacherCount: number;
  studentCount: number;
  subjects: PublicCenterSubject[];
  grades: PublicCenterSubject[];
  teachers?: PublicCenterTeacher[];
  centerEmail?: string | null;
  centerPhone?: string | null;
  ratingAverage?: number;
  ratingCount?: number;
}

export interface SearchTeachersParams {
  name?: string;
  subjectId?: string;
  gradeId?: string;
  grades?: string[];
  locationId?: string;
  centerId?: string;
  day?: number;
  maxPrice?: number;
  minRating?: number;
  time?: string;
  page?: number;
  limit?: number;
}

export interface SearchCentersParams {
  q?: string;
  city?: string;
  subject?: string;
  grade?: string;
  page?: number;
  limit?: number;
}

export interface SearchCentersResult {
  items: PublicCenter[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RegisterCenterPayload {
  name: string;
  email?: string;
  phone: string;
  city: string;
  address: string;
  description?: string;
  adminFullName: string;
  adminUsername: string;
  adminPhone: string;
  adminEmail: string;
  adminPassword: string;
}

export interface RegisterCenterResult {
  centerId: string;
  centerName: string;
  status: string;
  subscriptionStatus: string;
  requiresApproval: boolean;
  latitude?: number | null;
  longitude?: number | null;
  locationStatus?: 'success' | 'not_found' | 'unavailable' | 'skipped';
}

/** Public CENTER package (subscription plan) as exposed by the packages API. */
export interface CenterPackage {
  id: string;
  name: string;
  description?: string | null;
  billingPeriod: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  priceMonthly: number;
  currency: string;
  maxTeachers: number | null;
  maxStudents: number | null;
  maxEmployees: number | null;
  maxAssistants: number | null;
  maxRooms: number | null;
  commissionRate: number;
  includesChat: boolean;
  includesExams: boolean;
  includesAssignments: boolean;
  includesAttendance: boolean;
  includesPayments: boolean;
  includesAnalytics: boolean;
  includesMultiBranch: boolean;
}

export interface ApiMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: ApiMeta;
}

export class ApiClientError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  onUnauthorized = handler;
}

export function qs(params?: Record<string, string | number | undefined | null>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

async function rawRequest<T>(path: string, options: RequestInit): Promise<ApiResponse<T>> {
  // Never let a request hang forever: bound it with a timeout unless the
  // caller already provided its own signal.
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  let res: Response;
  try {
    res = await fetch(BASE + path, { ...options, signal: controller.signal, credentials: 'include' });
  } finally {
    window.clearTimeout(timer);
  }
  const isJson = (res.headers.get('content-type') ?? '').includes('application/json');
  let body: any = null;
  try {
    body = isJson ? await res.json() : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    throw new ApiClientError(
      body?.message ?? `Request failed (${res.status})`,
      res.status,
      body?.error?.code ?? body?.code,
      body?.error?.details,
    );
  }
  return body as ApiResponse<T>;
}

// Single-flight refresh guard. The backend rotates (single-use) the refresh
// token on every successful refresh, so firing several concurrent refresh
// calls with the same cookie would race: the first one revokes the token and
// the others fail as "Session has been revoked", force-logging the user out.
// Sharing one in-flight refresh promise ensures only a single refresh ever
// runs at a time while simultaneous 401 handlers await the same result.
let refreshInFlight: Promise<boolean> | null = null;

// Anonymous-auth optimization. The refresh token is HttpOnly (it cannot be
// inspected from JS), so we keep a small origin-scoped marker in localStorage:
//   - set on login, on a successful refresh, and on any successful /auth/me
//   - cleared on logout
// When the marker is absent there is (almost certainly) no session cookie, so
// a 401 on the bootstrap /auth/me skips the pointless POST /auth/refresh that
// would just 401 again. A valid returning session still restores because the
// marker survives page reloads; on write errors we default to attempting the
// refresh (the safe, pre-existing behaviour).
const AUTH_SESSION_KEY = 'maarech-auth-session';

// In-memory backup of the localStorage marker. It survives only within the
// current tab, but it covers the case where storage is cleared/wiped while a
// real (HttpOnly) refresh cookie still exists: the marker is gone, yet the
// user demonstrably authenticated earlier in this tab, so we must NOT skip a
// necessary refresh. It is reset on explicit logout with the marker.
let sessionSeenInTab = false;

/** Records that this browser holds (or has held) an account session. */
export function recordAuthSession(): void {
  sessionSeenInTab = true;
  try {
    window.localStorage.setItem(AUTH_SESSION_KEY, '1');
  } catch {
    /* storage unavailable — refresh path stays enabled */
  }
}

/** Clears the session record (e.g. explicit logout). */
export function clearAuthSessionRecord(): void {
  sessionSeenInTab = false;
  try {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

function hasAuthSessionRecord(): boolean {
  try {
    return sessionSeenInTab || window.localStorage.getItem(AUTH_SESSION_KEY) === '1';
  } catch {
    return true;
  }
}

function tryRefresh(): Promise<boolean> {
  if (!hasAuthSessionRecord()) return Promise.resolve(false);
  if (!refreshInFlight) {
    refreshInFlight = rawRequest('/auth/refresh', { method: 'POST' })
      .then(() => {
        recordAuthSession();
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function request<T>(path: string, options: RequestInit, retried = false): Promise<ApiResponse<T>> {
  try {
    return await rawRequest<T>(path, options);
  } catch (err) {
    // Debug aid: log the resolved API error (status/code/message) so the real
    // backend response is visible in the browser console instead of a generic
    // "Something went wrong." Only client-safe fields are logged - never any
    // server secret or internal detail.
    if (err instanceof ApiClientError) {
      if (typeof console !== 'undefined') {
        console.error(`[api] ${options.method ?? 'GET'} ${path} -> ${err.status}`, {
          code: err.code,
          message: err.message,
          details: err.details,
        });
      }
    }
    const needsAuth =
      err instanceof ApiClientError &&
      err.status === 401 &&
      !path.startsWith('/auth/login') &&
      !path.startsWith('/auth/refresh');
    if (needsAuth && !retried) {
      const refreshed = await tryRefresh();
      if (refreshed) return request<T>(path, options, true);
      onUnauthorized?.();
    }
    throw err;
  }
}

function jsonOptions(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };
}

// In-flight GET dedup. During navigation many views mount simultaneously and
// some pages request the same collection twice (notifications, my-teachers,
// branch/group form-data...). Collapsing identical in-flight GETs cuts those
// duplicate round-trips to a single network request. The entry is removed as
// soon as the promise settles so later independent loads still hit the API.
const inflightGets = new Map<string, Promise<ApiResponse<unknown>>>();

// Short-lived TTL cache for public catalog reference data (/catalog/subjects,
// /catalog/grades, /catalog/locations). Those endpoints are static and fetched
// by nearly every public + dashboard page, so a brief cache removes redundant
// round-trips during navigation. Admin edits clear the entries explicitly via
// invalidateCatalog (see CatalogManager).
const CATALOG_TTL_MS = 5 * 60_000;
const catalogCache = new Map<string, { expiresAt: number; data: unknown }>();

/** Drop cached catalog entries. Pass a specific endpoint (e.g. /catalog/subjects) or call with no args to clear all. */
export function invalidateCatalog(path?: string): void {
  if (path) catalogCache.delete(path);
  else catalogCache.clear();
}

function catalogCached<T>(url: string): Promise<ApiResponse<T>> | null {
  const entry = catalogCache.get(url);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    catalogCache.delete(url);
    return null;
  }
  return Promise.resolve(entry.data as ApiResponse<T>);
}

function apiGet<T>(path: string, params?: Record<string, string | number | undefined | null>) {
  const url = path + qs(params);
  if (path.startsWith('/catalog/')) {
    const cached = catalogCached<T>(url);
    if (cached) return cached;
  }
  const inflight = inflightGets.get(url);
  if (inflight) return inflight as Promise<ApiResponse<T>>;
  const promise = request<T>(url, { method: 'GET' });
  inflightGets.set(url, promise as Promise<ApiResponse<unknown>>);
  const settled = () => inflightGets.delete(url);
  promise.then(
    (res) => {
      if (path.startsWith('/catalog/')) catalogCache.set(url, { expiresAt: Date.now() + CATALOG_TTL_MS, data: res });
      settled();
    },
    settled,
  );
  return promise;
}

export const api = {
  get<T>(path: string, params?: Record<string, string | number | undefined | null>) {
    return apiGet<T>(path, params);
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, jsonOptions('POST', body));
  },
  put<T>(path: string, body?: unknown) {
    return request<T>(path, jsonOptions('PUT', body));
  },
  patch<T>(path: string, body?: unknown) {
    return request<T>(path, jsonOptions('PATCH', body));
  },
  delete<T>(path: string) {
    return request<T>(path, { method: 'DELETE' });
  },
  postForm<T>(path: string, form: FormData) {
    return request<T>(path, { method: 'POST', body: form });
  },
  putForm<T>(path: string, form: FormData) {
    return request<T>(path, { method: 'PUT', body: form });
  },
  bookLesson<T = unknown>(input: import('./types').BookLessonInput) {
    return request<T>('/lessons/book', jsonOptions('POST', input));
  },
  getAvailableSlots<T = import('./types').AvailableSlot[]>(teacherId: string, from?: string, to?: string) {
    return request<T>(`/teachers/${teacherId}/available-slots` + qs({ from, to }), { method: 'GET' });
  },
  getMyTeachers<T = import('./types').MyTeacher[]>() {
    return request<T>('/students/me/teachers', { method: 'GET' });
  },
  login(payload: LoginPayload) {
    return request<LoginResult>('/auth/login', jsonOptions('POST', payload)).then((res) => {
      recordAuthSession();
      return res;
    });
  },
  register(payload: RegisterPayload) {
    const { role, ...rest } = payload;
    return request<RegisterResult>(`/auth/register/${role.toLowerCase()}`, jsonOptions('POST', rest));
  },
  searchTeachers(params?: SearchTeachersParams) {
    const query = {
      ...params,
      grades: params?.grades?.join(','),
    };
    return apiGet<PublicTeacher[]>('/teachers', query as Record<string, string | number | undefined | null>);
  },
  getTeacher(id: string) {
    return request<TeacherProfile>('/teachers/' + encodeURIComponent(id), { method: 'GET' });
  },
  searchCenters(params?: SearchCentersParams) {
    return apiGet<SearchCentersResult>('/centers/search', params as Record<string, string | number | undefined | null>);
  },
  getPublicCenter(id: string) {
    return request<PublicCenter>('/centers/' + encodeURIComponent(id), { method: 'GET' });
  },
  /** Public: teachers that belong to ONE specific center. */
  getCenterTeachers(id: string) {
    return request<PublicCenterTeacher[]>(`/centers/${encodeURIComponent(id)}/teachers`, { method: 'GET' });
  },
  /** Public aggregated rating for a center. */
  getCenterRating(id: string) {
    return request<{ average: number; count: number }>(`/centers/${encodeURIComponent(id)}/rating`, { method: 'GET' });
  },
  /** The authenticated user's own rating for a center (or null). */
  getMyCenterRating(id: string) {
    return request<{ stars: number; comment: string | null; updatedAt: string } | null>(
      `/centers/${encodeURIComponent(id)}/rating/me`,
      { method: 'GET' },
    );
  },
  /** Submit / update the authenticated user's center rating (1-5 stars). */
  rateCenter(id: string, payload: { stars: number; comment?: string }) {
    return request(`/centers/${encodeURIComponent(id)}/rating`, jsonOptions('POST', payload));
  },
  /** Public CENTER packages (subscription plans) — no auth required. */
  getPublicCenterPlans() {
    return request<CenterPackage[]>('/subscriptions/public/center-plans', { method: 'GET' });
  },
  requestOtp(payload: { phone: string; purpose: string; payload: Record<string, unknown> }) {
    return request<OtpRequestResult>('/auth/otp/request', jsonOptions('POST', payload));
  },
  verifyOtp(payload: { verificationId: string; code: string }) {
    return request<RegisterVerificationResult>('/auth/otp/verify', jsonOptions('POST', payload));
  },
  resendOtp(verificationId: string) {
    return request<OtpRequestResult>('/auth/otp/resend', jsonOptions('POST', { verificationId }));
  },
  // Forgot password via phone OTP
  requestPasswordResetOtp(phone: string) {
    return request<{ verificationId: string; maskedPhone: string; expiresAt: string; resendCooldown: number; devOtp?: string }>(
      '/auth/forgot-password/phone',
      jsonOptions('POST', { phone }),
    );
  },
  verifyPasswordResetOtp(payload: { verificationId: string; code: string }) {
    return request<{ resetToken: string; expiresAt: string; maskedPhone: string }>(
      '/auth/forgot-password/verify',
      jsonOptions('POST', payload),
    );
  },
  resendPasswordResetOtp(verificationId: string) {
    return request<{ verificationId: string; maskedPhone: string; expiresAt: string; resendCooldown: number; devOtp?: string }>(
      '/auth/forgot-password/resend',
      jsonOptions('POST', { verificationId }),
    );
  },
  resetPassword(payload: { token: string; newPassword: string }) {
    return request('/auth/reset-password', jsonOptions('POST', payload));
  },  registerCenter(payload: RegisterCenterPayload) {
    return request<RegisterCenterResult>('/centers/register', jsonOptions('POST', payload));
  },
  // Student center follow (multi-center model)
  followCenter(centerId: string) {
    return request(`/students/follows/${encodeURIComponent(centerId)}`, jsonOptions('POST', {}));
  },
  unfollowCenter(centerId: string) {
    return request(`/students/follows/${encodeURIComponent(centerId)}`, { method: 'DELETE' });
  },
  getFollowedCenters() {
    return request<PublicCenter[]>('/students/follows', { method: 'GET' });
  },
  checkFollow(centerId: string) {
    return request<{ isFollowing: boolean }>(`/students/follows/${encodeURIComponent(centerId)}`, { method: 'GET' });
  },
};
