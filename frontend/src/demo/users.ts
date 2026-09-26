import type { User } from '../lib/types';
import { TEACHERS, teacherById, SUBJECTS, GRADES } from './catalog';
import { ok, fail } from './helpers';

/**
 * Demo accounts.
 *
 * Usernames are fixed so they can be typed into the login form or clicked from
 * the login page's demo-picker (login page reads GET /auth/mock-info).
 * Password for every demo account: Demo@12345
 */

export interface DemoAccountRow {
  username: string;
  role: string;
  fullName: string;
  centerId: string | null;
}

export const DEMO_PASSWORD = 'Demo@12345';

const sub = (id: string) => SUBJECTS.find((s) => s.id === id)!;
const gr = (id: string) => GRADES.find((g) => g.id === id)!;

export const DEMO_USERS: User[] = [
  {
    id: 'u-superadmin',
    username: 'superadmin',
    fullName: 'أحمد سمير',
    phone: '+20 100 555 0101',
    photo: null,
    email: 'ahmed.samir@maarech.app',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    createdAt: '2023-01-01T09:00:00.000Z',
    superAdmin: true,
  },
  {
    id: 'u-ca1',
    username: 'demo.center.admin1',
    fullName: 'هاني الخطيب',
    phone: '+20 100 555 0202',
    photo: null,
    email: 'hany.elkhatib@nile-education.eg',
    role: 'CENTER_ADMIN',
    status: 'ACTIVE',
    createdAt: '2023-02-15T10:00:00.000Z',
    admin: { id: 'ca-1' },
  },
  {
    id: 'u-t1',
    username: 'demo.teacher.1',
    fullName: 'د. أحمد عبد الرحمن',
    phone: '+20 100 555 0303',
    photo: null,
    email: 'ahmed.abdulrahman@gmail.com',
    role: 'TEACHER',
    status: 'ACTIVE',
    createdAt: '2023-03-01T11:00:00.000Z',
    teacher: teacherInfoFromPool('t-01'),
  },
  {
    id: 'u-stu1',
    username: 'demo.student.1',
    fullName: 'عمر محمد',
    phone: '+20 100 555 0404',
    photo: null,
    email: 'omar.mohamed@gmail.com',
    role: 'STUDENT',
    status: 'ACTIVE',
    createdAt: '2023-04-10T12:00:00.000Z',
    student: {
      id: 'stu-1',
      studentNumber: 'STU-2023-0001',
      grade: gr('g1s'),
      subjects: [sub('sub-math'), sub('sub-arabic'), sub('sub-physics')],
      teachers: [
        { id: 't-01', fullName: 'د. أحمد عبد الرحمن', photo: null },
        { id: 't-05', fullName: 'د. حسام الدين إبراهيم', photo: null },
        { id: 't-07', fullName: 'أ. كريم عاصم', photo: null },
      ],
      parents: [{ id: 'par-1', fullName: 'محمد عادل' }],
    },
  },
  {
    id: 'u-par1',
    username: 'demo.parent.1',
    fullName: 'محمد عادل',
    phone: '+20 100 555 0505',
    photo: null,
    email: 'mohamed.adel@outlook.com',
    role: 'PARENT',
    status: 'ACTIVE',
    createdAt: '2023-04-10T12:30:00.000Z',
    parent: {
      id: 'par-1',
      children: [
        { id: 'stu-1', userId: 'u-stu1', fullName: 'عمر محمد', photo: null, grade: 'Grade 1 Secondary', studentNumber: 'STU-2023-0001' },
        { id: 'stu-2', userId: 'u-stu2', fullName: 'نور محمد', photo: null, grade: 'Grade 3 Preparatory', studentNumber: 'STU-2023-0002' },
      ],
    },
  },
];

function teacherInfoFromPool(id: string): NonNullable<Extract<User, { role: 'TEACHER' }>['teacher']> {
  const t = teacherById(id)!;
  return {
    id: t.id,
    bio: t.bio,
    yearsExperience: t.yearsExperience,
    hourlyRate: t.hourlyRate,
    location: t.location ? { id: t.location.id, name: t.location.name } : null,
    subjects: t.subjects,
    grades: t.grades,
    availability: t.availability,
  };
}

/** Teacher pool entry whose profile powers the demo TEACHER dashboard. */
export const DEMO_TEACHER_POOL = TEACHERS.find((t) => t.id === 't-01')!;

const DEMO_ACCOUNT_ROWS: DemoAccountRow[] = DEMO_USERS.map((u) => ({
  username: u.username,
  role: u.role,
  fullName: u.fullName,
  centerId:
    u.role === 'CENTER_ADMIN' && 'admin' in u && u.admin ? 'c-nile' : u.role === 'ADMIN' && 'admin' in u && u.admin ? u.admin.id : null,
}));

/** The exact user objects served by the demo auth endpoints. */
export function demoUserByUsername(username: string): User | undefined {
  return DEMO_USERS.find((u) => u.username === username);
}

export function demoAccountRows(): DemoAccountRow[] {
  return DEMO_ACCOUNT_ROWS;
}

/* ------------------------------------------------------------------ */
/*  Demo-session marker (client side only, demo flag required).        */
/* ------------------------------------------------------------------ */

export const DEMO_SESSION_KEY = 'maarech-ui-demo-user';

export function getDemoUsername(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(DEMO_SESSION_KEY);
  } catch {
    return null;
  }
}

export function setDemoUsername(username: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (username) window.localStorage.setItem(DEMO_SESSION_KEY, username);
    else window.localStorage.removeItem(DEMO_SESSION_KEY);
  } catch { /* ignore */ }
}

/**
 * The center object returned for the demo CENTER_ADMIN account.
 * Matches the `Center` shape in lib/api (id/name/slug/status/subscriptionStatus/requiresApproval).
 */
export function demoCenterForUser(user: User | undefined): { id: string; name: string; slug: string; status: string; subscriptionStatus: string; requiresApproval: boolean } | null {
  if (!user) return null;
  if (user.role === 'CENTER_ADMIN' && 'admin' in user && user.admin) {
    return {
      id: 'c-nile',
      name: 'مركز النيل للتعليم',
      slug: 'nile-education-center',
      status: 'ACTIVE',
      subscriptionStatus: 'ACTIVE',
      requiresApproval: false,
    };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Auth endpoint handlers (client side only).                         */
/* ------------------------------------------------------------------ */

export function authMockInfo() {
  return ok({
    enabled: true,
    password: DEMO_PASSWORD,
    accounts: DEMO_ACCOUNT_ROWS,
  });
}

export function authLogin(body: unknown) {
  const payload = (body ?? {}) as { username?: string; password?: string };
  const username = (payload.username ?? '').trim();
  const password = payload.password ?? '';
  const user = demoUserByUsername(username);
  if (!user || password !== DEMO_PASSWORD) {
    return { status: 401, response: fail('اسم المستخدم أو كلمة المرور غير صحيحة.') };
  }
  setDemoUsername(username);
  return {
    status: 200,
    response: ok({
      user,
      center: demoCenterForUser(user),
    }),
  };
}

export function authMe() {
  const username = getDemoUsername();
  if (!username) return { status: 401, response: fail('غير مسجل الدخول.') };
  const user = demoUserByUsername(username);
  if (!user) return { status: 401, response: fail('الجلسة غير صالحة.') };
  return { status: 200, response: ok(user) };
}

export function authRefresh() {
  return { status: 200, response: ok({}) };
}

export function authLogout() {
  setDemoUsername(null);
  return { status: 200, response: ok({}) };
}