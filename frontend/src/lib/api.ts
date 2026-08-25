import type { PublicTeacher, TeacherProfile, User } from './types';

const BASE = '/api';

/** Hard cap for every API call so a stalled backend can never block the UI. */
export const REQUEST_TIMEOUT_MS = 12_000;
/** Abort errors surface as network failures with a clear message. */
export const TIMEOUT_MESSAGE = 'The server took too long to respond. Please try again.';

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
      body?.code,
      body?.error?.details,
    );
  }
  return body as ApiResponse<T>;
}

async function tryRefresh(): Promise<boolean> {
  try {
    await rawRequest('/auth/refresh', { method: 'POST' });
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestInit, retried = false): Promise<ApiResponse<T>> {
  try {
    return await rawRequest<T>(path, options);
  } catch (err) {
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

export const api = {
  get<T>(path: string, params?: Record<string, string | number | undefined | null>) {
    return request<T>(path + qs(params), { method: 'GET' });
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
    return request<LoginResult>('/auth/login', jsonOptions('POST', payload));
  },
  register(payload: RegisterPayload) {
    const { role, ...rest } = payload;
    return request<RegisterResult>(`/auth/register/${role.toLowerCase()}`, jsonOptions('POST', rest));
  },
  searchTeachers(params?: SearchTeachersParams) {
    return request<PublicTeacher[]>(
      '/teachers' + qs(params as Record<string, string | number | undefined | null>),
      { method: 'GET' },
    );
  },
  getTeacher(id: string) {
    return request<TeacherProfile>('/teachers/' + encodeURIComponent(id), { method: 'GET' });
  },
  searchCenters(params?: SearchCentersParams) {
    return request<SearchCentersResult>('/centers/search' + qs(params as Record<string, string | number | undefined | null>), {
      method: 'GET',
    });
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
  requestOtp(payload: { phone: string; purpose: string; payload: any }) {
    return request<{ verificationId: string; maskedPhone: string; expiresAt: string; devOtp?: string }>('/auth/otp/request', jsonOptions('POST', payload));
  },
  verifyOtp(payload: { verificationId: string; code: string }) {
    return request<any>('/auth/otp/verify', jsonOptions('POST', payload));
  },
  resendOtp(verificationId: string) {
    return request<{ verificationId: string; maskedPhone: string; expiresAt: string }>('/auth/otp/resend', jsonOptions('POST', { verificationId }));
  },  registerCenter(payload: RegisterCenterPayload) {
    return request<RegisterCenterResult>('/centers/register', jsonOptions('POST', payload));
  },
};
