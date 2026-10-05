import { hashPassword } from '../utils/password';

/* ------------------------------------------------------------------ */
/*  DEV_MOCK_DATA â€” realistic in-memory seed (never touches Neon).    */
/*  All passwords are the argon2 hash of 'Demo@12345'.                */
/* ------------------------------------------------------------------ */

const DEMO_PASSWORD = 'Demo@12345';
let passwordHash = '';

export async function ensurePasswordHash() {
  if (!passwordHash) passwordHash = await hashPassword(DEMO_PASSWORD);
}
export function getDemoPasswordHash() { return passwordHash; }

/* --------------------------- IDs -------------------------------- */
const uid = (p: string, n: number) => `mock-${p}-${String(n).padStart(3, '0')}`;
const USER = (n: number) => uid('us', n);
const TC = (n: number) => uid('tc', n);
const ST = (n: number) => uid('st', n);
const PA = (n: number) => uid('pa', n);
const CN = (n: number) => uid('cn', n);
const SB = (n: number) => uid('sb', n);
const GD = (n: number) => uid('gd', n);
const LO = (n: number) => uid('lo', n);
const RM = (n: number) => uid('rm', n);
const LS = (n: number) => uid('ls', n);
const BK = (n: number) => uid('bk', n);
const PAY = (n: number) => uid('pay', n);
const ATT = (n: number) => uid('att', n);
const NOT = (n: number) => uid('not', n);
const ASM = (n: number) => uid('asm', n);
const EX = (n: number) => uid('ex', n);
const BC = (n: number) => uid('bc', n);
const CV = (n: number) => uid('cv', n);
const MS = (n: number) => uid('ms', n);
const RT = (n: number) => uid('rt', n);
const TR = (n: number) => uid('tr', n);
const EXPT = (n: number) => uid('expt', n);
const TSK = (n: number) => uid('tsk', n);
const CM = (n: number) => uid('cm', n);
const STL = (n: number) => uid('stl', n);
const INV = (n: number) => uid('inv', n);
const DOC = (n: number) => uid('doc', n);
const GRP = (n: number) => uid('grp', n);
const GT = (n: number) => uid('gt', n);
const LE = (n: number) => uid('le', n);
const CR = (n: number) => uid('cr', n);
const CS = (n: number) => uid('cs', n);
const PL = (n: number) => uid('pl', n);
const BS = (n: number) => uid('bs', n);
const CP = (n: number) => uid('cp', n);

/* ------------------------- Centers ------------------------------ */
interface CenterSeed { slug: string; name: string; city: string; address: string; phone: string; email: string; lat: number; lng: number; adminUsername: string; adminName: string; adminPhone: string; adminEmail: string; plan: string; }
const CENTERS: CenterSeed[] = [
  { slug: 'nile-education-center', name: 'Nile Education Center', city: 'Cairo', address: '90 Rd 90, Fifth Settlement, New Cairo', phone: '+20 2 2445 1200', email: 'info@nile-education.eg', lat: 30.0131, lng: 31.4869, adminUsername: 'demo.center.admin1', adminName: 'Karim El-Sayed', adminPhone: '+20 111 234 5678', adminEmail: 'k.el-sayed@nile-education.eg', plan: 'Tier 2' },
  { slug: 'future-academy', name: 'Future Academy', city: 'Cairo', address: '12 Abbas El-Akkad St, Nasr City', phone: '+20 2 2276 5400', email: 'contact@future-academy.eg', lat: 30.0623, lng: 31.3393, adminUsername: 'demo.center.admin2', adminName: 'Dina Adel', adminPhone: '+20 122 345 6789', adminEmail: 'd.adel@future-academy.eg', plan: 'Tier 3' },
  { slug: 'excellence-learning-center', name: 'Excellence Learning Center', city: 'Giza', address: '26 Mosadak St, Dokki', phone: '+20 2 3336 7200', email: 'hello@excellence-learning.eg', lat: 30.0370, lng: 31.2075, adminUsername: 'demo.center.admin3', adminName: 'Hassan Farouk', adminPhone: '+20 100 456 7890', adminEmail: 'h.farouk@excellence-learning.eg', plan: 'Tier 1' },
  { slug: 'smart-minds-academy', name: 'Smart Minds Academy', city: 'Cairo', address: '45 Road 9, El-Maadi', phone: '+20 2 2521 6600', email: 'info@smart-minds.eg', lat: 29.9621, lng: 31.2578, adminUsername: 'demo.center.admin4', adminName: 'Mona Tarek', adminPhone: '+20 101 567 8901', adminEmail: 'm.tarek@smart-minds.eg', plan: 'Tier 1' },
  { slug: 'bright-future-center', name: 'Bright Future Center', city: 'Giza', address: 'Zone 6, 6th of October City', phone: '+20 2 3832 1100', email: 'support@bright-future.eg', lat: 29.9731, lng: 30.9169, adminUsername: 'demo.center.admin5', adminName: 'Omar Khaled', adminPhone: '+20 109 678 9012', adminEmail: 'o.khaled@bright-future.eg', plan: 'Tier 2' },
];

const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Arabic', 'Computer Science', 'French'];
const GRADES = ['Grade 1 Primary', 'Grade 2 Primary', 'Grade 3 Primary', 'Grade 4 Primary', 'Grade 5 Primary', 'Grade 6 Primary', 'Grade 1 Preparatory', 'Grade 2 Preparatory', 'Grade 3 Preparatory', 'Grade 1 Secondary', 'Grade 2 Secondary', 'Grade 3 Secondary'];

/* ------------------- RBAC permission matrix --------------------- */
/* Mirrors backend/prisma/seed.ts ROLE_PERMISSIONS so RBAC works in mock mode. */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    'centers.view', 'centers.create', 'centers.update', 'centers.delete', 'centers.approve', 'centers.suspend',
    'rooms.view', 'rooms.create', 'rooms.update', 'rooms.delete', 'analytics.view',
    'teachers.view', 'teachers.create', 'teachers.update', 'teachers.delete',
    'students.view', 'students.create', 'students.update', 'students.delete',
    'parents.view', 'parents.create', 'parents.update', 'parents.delete',
    'lessons.view', 'lessons.create', 'lessons.update', 'lessons.delete',
    'attendance.view', 'attendance.mark', 'attendance.update',
    'assignments.view', 'assignments.create', 'assignments.update', 'assignments.delete', 'assignments.grade',
    'exams.view', 'exams.create', 'exams.update', 'exams.delete', 'exams.grade',
    'payments.view', 'payments.create', 'payments.update', 'payments.approve', 'payments.reject', 'payments.refund',
    'wallets.view', 'wallets.deposit', 'wallets.withdraw',
    'subscriptions.view', 'subscriptions.create', 'subscriptions.update', 'subscriptions.cancel',
    'reports.view', 'reports.export', 'reports.create',
    'reports.financial.view', 'reports.attendance.view', 'reports.student.view', 'reports.teacher.view',
    'settings.view', 'settings.update', 'chat.view', 'chat.send',
    'locations.view', 'locations.create', 'locations.update', 'locations.delete',
    'grades.view', 'grades.manage', 'subjects.view', 'subjects.manage',
    'settlements.view', 'settlements.process', 'invoices.view', 'invoices.create',
    'plans.view', 'plans.create', 'plans.update', 'plans.delete', 'plans.assign',
    'documents.view', 'documents.create', 'documents.update', 'documents.delete', 'documents.verify',
  ],
  CENTER_ADMIN: [
    'centers.view', 'centers.update',
    'rooms.view', 'rooms.create', 'rooms.update', 'rooms.delete', 'analytics.view',
    'teachers.view', 'teachers.create', 'teachers.update', 'teachers.delete',
    'students.view', 'students.create', 'students.update', 'students.delete',
    'parents.view', 'parents.create', 'parents.update', 'parents.delete',
    'lessons.view', 'lessons.create', 'lessons.update', 'lessons.delete',
    'attendance.view', 'attendance.mark', 'attendance.update',
    'assignments.view', 'assignments.create', 'assignments.update', 'assignments.delete', 'assignments.grade',
    'exams.view', 'exams.create', 'exams.update', 'exams.delete', 'exams.grade',
    'payments.view', 'payments.create', 'payments.update', 'payments.approve', 'payments.reject', 'payments.refund',
    'wallets.view', 'wallets.deposit', 'wallets.withdraw',
    'subscriptions.view', 'subscriptions.create', 'subscriptions.update', 'subscriptions.cancel',
    'reports.view', 'reports.export', 'reports.create',
    'reports.financial.view', 'reports.attendance.view', 'reports.student.view', 'reports.teacher.view',
    'settings.view', 'settings.update', 'chat.view', 'chat.send',
    'locations.view', 'locations.create', 'locations.update', 'locations.delete',
    'grades.view', 'grades.manage', 'subjects.view', 'subjects.manage',
    'settlements.view', 'settlements.process', 'invoices.view', 'invoices.create',
    'documents.view', 'documents.create', 'documents.update', 'documents.delete', 'documents.verify',
    'notifications.view', 'notifications.update',
  ],
  ADMIN: [
    'teachers.view', 'teachers.create', 'teachers.update', 'teachers.delete',
    'students.view', 'students.create', 'students.update', 'students.delete',
    'parents.view', 'parents.create', 'parents.update', 'parents.delete',
    'lessons.view', 'lessons.create', 'lessons.update', 'lessons.delete',
    'attendance.view', 'attendance.mark', 'attendance.update',
    'assignments.view', 'assignments.create', 'assignments.update', 'assignments.delete', 'assignments.grade',
    'exams.view', 'exams.create', 'exams.update', 'exams.delete', 'exams.grade',
    'payments.view', 'payments.create', 'payments.update', 'payments.approve', 'payments.reject', 'payments.refund',
    'wallets.view', 'wallets.deposit', 'wallets.withdraw',
    'subscriptions.view', 'subscriptions.create', 'subscriptions.update', 'subscriptions.cancel',
    'reports.view', 'reports.export', 'reports.financial.view', 'reports.attendance.view', 'reports.student.view', 'reports.teacher.view',
    'settings.view', 'settings.update', 'chat.view', 'chat.send',
    'locations.view', 'locations.create', 'locations.update', 'locations.delete',
    'grades.view', 'grades.manage', 'subjects.view', 'subjects.manage',
    'settlements.view', 'settlements.process', 'invoices.view', 'invoices.create',
    'documents.view', 'documents.create', 'documents.update', 'documents.delete', 'documents.verify',
    'notifications.view', 'notifications.update',
  ],
  CENTER_EMPLOYEE: [
    'teachers.view', 'students.view', 'parents.view',
    'lessons.view', 'attendance.view', 'attendance.mark',
    'assignments.view', 'exams.view',
    'payments.view', 'payments.create', 'wallets.view',
    'subscriptions.view', 'reports.view', 'chat.view', 'chat.send',
    'locations.view', 'grades.view', 'subjects.view',
    'documents.view', 'documents.create',
  ],
  RECEPTIONIST: [
    'teachers.view', 'students.view', 'students.create', 'students.update',
    'parents.view', 'parents.create', 'parents.update',
    'lessons.view', 'payments.view', 'payments.create', 'payments.approve',
    'subscriptions.view', 'subscriptions.create', 'chat.view',
    'grades.view', 'subjects.view', 'documents.view', 'documents.create', 'documents.verify',
  ],
  TEACHER: [
    'students.view',
    'lessons.view', 'lessons.create', 'lessons.update',
    'attendance.view', 'attendance.mark',
    'assignments.view', 'assignments.create', 'assignments.update', 'assignments.grade',
    'exams.view', 'exams.create', 'exams.update', 'exams.grade',
    'payments.view', 'payments.update', 'wallets.view',
    'chat.view', 'chat.send', 'grades.view', 'subjects.view',
    'documents.view', 'documents.create',
    'notifications.view', 'notifications.update',
  ],
  TEACHER_ASSISTANT: [
    'students.view', 'lessons.view', 'attendance.view', 'attendance.mark',
    'assignments.view', 'assignments.grade', 'exams.view', 'wallets.view', 'chat.view',
    'grades.view', 'subjects.view', 'documents.view', 'documents.create',
  ],
  STUDENT: [
    'lessons.view',
    'lessons.create', // student self-booking via POST /lessons/book (public teacher sheet)
    'attendance.view', 'assignments.view', 'exams.view',
    'payments.view', 'wallets.view', 'chat.view', 'chat.send',
    'grades.view', 'subjects.view', 'documents.view', 'documents.create',
    'notifications.view', 'notifications.update',
  ],
  PARENT: [
    'students.view', 'lessons.view', 'attendance.view', 'assignments.view', 'exams.view',
    'payments.view', 'payments.create', 'wallets.view',
    'chat.view', 'chat.send', 'grades.view', 'subjects.view',
    'documents.view', 'documents.create',
    'notifications.view', 'notifications.update',
  ],
};

/* --------------------------- Teachers --------------------------- */
interface TeacherSeed { username: string; fullName: string; email: string; phone: string; bio: string; centerSlug: string; subjects: string[]; grades: string[]; exp: number; rate: number; locations: string[]; avail: { day: number; start: string; end: string }[]; }
const TEACHERS: TeacherSeed[] = [
  { username: 'demo.teacher.1', fullName: 'Ahmed Hassan', email: 'ahmed.hassan@nile-education.eg', phone: '+20 111 111 1111', bio: 'Mathematics specialist.', centerSlug: 'nile-education-center', subjects: ['Mathematics'], grades: ['Grade 1 Primary', 'Grade 2 Primary', 'Grade 3 Primary'], exp: 8, rate: 200, locations: ['Cairo Branch', 'Giza Branch'], avail: [{ day: 0, start: '10:00', end: '11:00' }, { day: 0, start: '12:00', end: '13:00' }, { day: 1, start: '14:00', end: '15:00' }, { day: 3, start: '16:00', end: '17:00' }] },
  { username: 'demo.mohamed.ali', fullName: 'Mohamed Ali', email: 'mohamed.ali@excellence-learning.eg', phone: '+20 122 222 2222', bio: 'Physics teacher.', centerSlug: 'excellence-learning-center', subjects: ['Physics'], grades: ['Grade 2 Primary', 'Grade 3 Primary', 'Grade 1 Preparatory'], exp: 6, rate: 180, locations: ['Dokki Branch'], avail: [{ day: 2, start: '14:00', end: '15:00' }, { day: 2, start: '17:00', end: '18:00' }, { day: 4, start: '16:00', end: '17:00' }] },
  { username: 'demo.teacher.2', fullName: 'Sara Mostafa', email: 'sara.mostafa@future-academy.eg', phone: '+20 133 333 3333', bio: 'English & French.', centerSlug: 'future-academy', subjects: ['English', 'French'], grades: ['Grade 4 Primary', 'Grade 5 Primary', 'Grade 6 Primary', 'Grade 1 Preparatory'], exp: 7, rate: 160, locations: ['Nasr City Branch'], avail: [{ day: 6, start: '10:00', end: '11:00' }, { day: 1, start: '16:00', end: '17:00' }, { day: 1, start: '18:00', end: '19:00' }] },
  { username: 'demo.fatma.yousef', fullName: 'Fatma Yousef', email: 'fatma.yousef@nile-education.eg', phone: '+20 144 444 4444', bio: 'Chemistry & Biology.', centerSlug: 'nile-education-center', subjects: ['Chemistry', 'Biology'], grades: ['Grade 2 Preparatory', 'Grade 3 Preparatory', 'Grade 1 Secondary'], exp: 11, rate: 220, locations: ['Cairo Branch'], avail: [{ day: 0, start: '14:00', end: '15:00' }, { day: 3, start: '17:00', end: '18:00' }] },
  { username: 'demo.omar.salem', fullName: 'Omar Salem', email: 'omar.salem@smart-minds.eg', phone: '+20 155 555 5555', bio: 'Computer Science.', centerSlug: 'smart-minds-academy', subjects: ['Computer Science'], grades: ['Grade 5 Primary', 'Grade 6 Primary', 'Grade 1 Preparatory'], exp: 4, rate: 150, locations: ['Maadi Branch'], avail: [{ day: 4, start: '12:00', end: '13:00' }, { day: 4, start: '15:00', end: '16:00' }] },
  { username: 'demo.khaled.ibrahim', fullName: 'Khaled Ibrahim', email: 'khaled.ibrahim@bright-future.eg', phone: '+20 166 666 6666', bio: 'Arabic & Math.', centerSlug: 'bright-future-center', subjects: ['Arabic', 'Mathematics'], grades: ['Grade 1 Primary', 'Grade 2 Primary', 'Grade 3 Primary'], exp: 5, rate: 140, locations: ['October Branch'], avail: [{ day: 1, start: '10:00', end: '11:00' }, { day: 2, start: '13:00', end: '14:00' }, { day: 4, start: '09:00', end: '10:00' }] },
  { username: 'demo.heba.nabil', fullName: 'Heba Nabil', email: 'heba.nabil@future-academy.eg', phone: '+20 177 777 7777', bio: 'Biology & Chemistry.', centerSlug: 'future-academy', subjects: ['Biology', 'Chemistry'], grades: ['Grade 2 Secondary', 'Grade 3 Secondary'], exp: 9, rate: 210, locations: ['Nasr City Branch'], avail: [{ day: 6, start: '16:00', end: '17:00' }, { day: 3, start: '14:00', end: '15:00' }, { day: 4, start: '17:00', end: '18:00' }] },
  { username: 'demo.amr.fathy', fullName: 'Amr Fathy', email: 'amr.fathy@excellence-learning.eg', phone: '+20 188 888 8888', bio: 'Physics specialist.', centerSlug: 'excellence-learning-center', subjects: ['Physics', 'Mathematics'], grades: ['Grade 2 Secondary', 'Grade 3 Secondary'], exp: 10, rate: 230, locations: ['Dokki Branch'], avail: [{ day: 0, start: '17:00', end: '18:00' }, { day: 2, start: '18:00', end: '19:00' }] },
  { username: 'demo.nour.ali', fullName: 'Nour Ali', email: 'nour.ali@bright-future.eg', phone: '+20 199 999 9999', bio: 'English coach.', centerSlug: 'bright-future-center', subjects: ['English'], grades: ['Grade 1 Primary', 'Grade 2 Primary', 'Grade 3 Primary', 'Grade 4 Primary'], exp: 3, rate: 130, locations: ['October Branch'], avail: [{ day: 6, start: '09:00', end: '10:00' }, { day: 1, start: '12:00', end: '13:00' }, { day: 3, start: '15:00', end: '16:00' }] },
  { username: 'demo.careem.said', fullName: 'Careem Said', email: 'careem.said@smart-minds.eg', phone: '+20 120 102 0304', bio: 'Math & CS.', centerSlug: 'smart-minds-academy', subjects: ['Mathematics', 'Computer Science'], grades: ['Grade 1 Secondary', 'Grade 2 Secondary', 'Grade 3 Secondary'], exp: 6, rate: 190, locations: ['Maadi Branch'], avail: [{ day: 0, start: '15:00', end: '16:00' }, { day: 1, start: '17:00', end: '18:00' }, { day: 4, start: '11:00', end: '12:00' }] },
];

/* --------------------------- Students --------------------------- */
interface StudentSeed { username: string; fullName: string; email: string; phone: string; grade: string; subjects: string[]; parentUsername: string; centerSlug: string; teacherUsernames: string[]; followsCenters: string[]; }
const STUDENTS: StudentSeed[] = [
  { username: 'demo.student.1', fullName: 'Omar Mohamed', email: 'omar.mohamed@demo.eg', phone: '+20 100 001 0001', grade: 'Grade 1 Primary', subjects: ['Mathematics', 'Arabic'], parentUsername: 'demo.parent.1', centerSlug: 'nile-education-center', teacherUsernames: ['demo.teacher.1', 'demo.khaled.ibrahim'], followsCenters: ['nile-education-center', 'bright-future-center'] },
  { username: 'demo.student.2', fullName: 'Youssef Mansour', email: 'youssef.mansour@demo.eg', phone: '+20 100 002 0002', grade: 'Grade 2 Primary', subjects: ['Physics', 'Mathematics'], parentUsername: 'demo.parent.2', centerSlug: 'excellence-learning-center', teacherUsernames: ['demo.mohamed.ali', 'demo.khaled.ibrahim'], followsCenters: ['excellence-learning-center'] },
  { username: 'demo.student.3', fullName: 'Laila Samir', email: 'laila.samir@demo.eg', phone: '+20 100 003 0003', grade: 'Grade 5 Primary', subjects: ['English', 'Computer Science'], parentUsername: 'demo.parent.1', centerSlug: 'smart-minds-academy', teacherUsernames: ['demo.omar.salem', 'demo.teacher.2'], followsCenters: ['smart-minds-academy'] },
  { username: 'demo.student.4', fullName: 'Mariam Adel', email: 'mariam.adel@demo.eg', phone: '+20 100 004 0004', grade: 'Grade 3 Secondary', subjects: ['Biology', 'Chemistry'], parentUsername: 'demo.parent.3', centerSlug: 'future-academy', teacherUsernames: ['demo.heba.nabil', 'demo.amr.fathy'], followsCenters: ['future-academy', 'excellence-learning-center'] },
  { username: 'demo.student.5', fullName: 'Hassan Tarek', email: 'hassan.tarek@demo.eg', phone: '+20 100 005 0005', grade: 'Grade 3 Primary', subjects: ['English', 'Mathematics'], parentUsername: 'demo.parent.2', centerSlug: 'bright-future-center', teacherUsernames: ['demo.khaled.ibrahim', 'demo.nour.ali'], followsCenters: ['bright-future-center'] },
  { username: 'demo.student.6', fullName: 'Salma Hany', email: 'salma.hany@demo.eg', phone: '+20 100 006 0006', grade: 'Grade 2 Secondary', subjects: ['Physics', 'Mathematics'], parentUsername: 'demo.parent.3', centerSlug: 'smart-minds-academy', teacherUsernames: ['demo.careem.said', 'demo.amr.fathy'], followsCenters: ['smart-minds-academy'] },
  { username: 'demo.student.7', fullName: 'Mustafa Adel', email: 'mustafa.adel@demo.eg', phone: '+20 100 007 0007', grade: 'Grade 1 Secondary', subjects: ['Chemistry', 'Biology'], parentUsername: 'demo.parent.4', centerSlug: 'nile-education-center', teacherUsernames: ['demo.fatma.yousef'], followsCenters: ['nile-education-center'] },
  { username: 'demo.student.8', fullName: 'Farida Nabil', email: 'farida.nabil@demo.eg', phone: '+20 100 008 0008', grade: 'Grade 6 Primary', subjects: ['English', 'French'], parentUsername: 'demo.parent.4', centerSlug: 'future-academy', teacherUsernames: ['demo.teacher.2'], followsCenters: ['future-academy'] },
  { username: 'demo.student.9', fullName: 'Kareem Samy', email: 'kareem.samy@demo.eg', phone: '+20 100 009 0009', grade: 'Grade 2 Preparatory', subjects: ['Physics', 'Biology'], parentUsername: 'demo.parent.5', centerSlug: 'excellence-learning-center', teacherUsernames: ['demo.mohamed.ali', 'demo.teacher.2'], followsCenters: ['excellence-learning-center'] },
  { username: 'demo.student.10', fullName: 'Nada Waleed', email: 'nada.waleed@demo.eg', phone: '+20 100 010 0100', grade: 'Grade 3 Secondary', subjects: ['Mathematics', 'Computer Science'], parentUsername: 'demo.parent.5', centerSlug: 'smart-minds-academy', teacherUsernames: ['demo.careem.said', 'demo.amr.fathy'], followsCenters: ['smart-minds-academy', 'excellence-learning-center'] },
];

/* --------------------------- Parents ---------------------------- */
const PARENTS = [
  { username: 'demo.parent.1', fullName: 'Mr. Mohamed Hassan', email: 'parent1@demo.eg', phone: '+20 110 001 0001', centerSlug: 'nile-education-center' },
  { username: 'demo.parent.2', fullName: 'Mrs. Amina Mansour', email: 'parent2@demo.eg', phone: '+20 110 002 0002', centerSlug: 'bright-future-center' },
  { username: 'demo.parent.3', fullName: 'Mr. Adel Samir', email: 'parent3@demo.eg', phone: '+20 110 003 0003', centerSlug: 'future-academy' },
  { username: 'demo.parent.4', fullName: 'Mrs. Salwa Hany', email: 'parent4@demo.eg', phone: '+20 110 004 0004', centerSlug: 'nile-education-center' },
  { username: 'demo.parent.5', fullName: 'Mr. Waleed Samy', email: 'parent5@demo.eg', phone: '+20 110 005 0005', centerSlug: 'smart-minds-academy' },
];

/* ----------------------- Seed function -------------------------- */
export interface MockStore {
  users: Map<string, any>;
  teachers: Map<string, any>;
  students: Map<string, any>;
  parents: Map<string, any>;
  centers: Map<string, any>;
  subjects: Map<string, any>;
  grades: Map<string, any>;
  locations: Map<string, any>;
  rooms: Map<string, any>;
  centerSettings: Map<string, any>;
  subscriptionPlans: Map<string, any>;
  lessons: Map<string, any>;
  roomBookings: Map<string, any>;
  payments: Map<string, any>;
  attendance: Map<string, any>;
  attendanceQrSessions: Map<string, any>;
  notifications: Map<string, any>;
  assignments: Map<string, any>;
  assignmentStudents: Map<string, any>;
  assignmentSubmissions: Map<string, any>;
  exams: Map<string, any>;
  examQuestions: Map<string, any>;
  examAttempts: Map<string, any>;
  examAnswers: Map<string, any>;
  examStudents: Map<string, any>;
  broadcasts: Map<string, any>;
  conversations: Map<string, any>;
  messages: Map<string, any>;
  ratings: Map<string, any>;
  centerRatings: Map<string, any>;
  wallets: Map<string, any>;
  walletTransactions: Map<string, any>;
  teacherSubjects: Map<string, any>;
  teacherGrades: Map<string, any>;
  teacherAvailabilities: Map<string, any>;
  teacherPaymentSettings: Map<string, any>;
  teacherStudents: Map<string, any>;
  teacherAssistants: Map<string, any>;
  studentSubjects: Map<string, any>;
  parentStudents: Map<string, any>;
  studentCenterFollows: Map<string, any>;
  transportRoutes: Map<string, any>;
  transportStudents: Map<string, any>;
  expenses: Map<string, any>;
  employeeTasks: Map<string, any>;
  centerMessages: Map<string, any>;
  settlements: Map<string, any>;
  invoices: Map<string, any>;
  documents: Map<string, any>;
  groups: Map<string, any>;
  groupEnrollments: Map<string, any>;
  lessonEnrollments: Map<string, any>;
  billingSubscriptions: Map<string, any>;
  complaints: Map<string, any>;
  centerRegistrationRequests: Map<string, any>;
  activityLogs: Map<string, any>;
  refreshTokens: Map<string, any>;
  passwordResetTokens: Map<string, any>;
  notificationTemplates: Map<string, any>;
  phoneVerifications: Map<string, any>;
  permissions: Map<string, any>;
  rolePermissions: Map<string, any>;
}

let store: MockStore | null = null;
const userByUsername = new Map<string, string>();
const teacherByUsername = new Map<string, string>();
const studentByUsername = new Map<string, string>();
const centerBySlug = new Map<string, string>();
const subjectByName = new Map<string, string>();
const gradeByName = new Map<string, string>();

function today() { return new Date(); }
function daysFromNow(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d; }

export async function seedStore() {
  await ensurePasswordHash();
  const h = passwordHash;
  const s: MockStore = {
    users: new Map(), teachers: new Map(), students: new Map(), parents: new Map(),
    centers: new Map(), subjects: new Map(), grades: new Map(), locations: new Map(), rooms: new Map(),
    centerSettings: new Map(), subscriptionPlans: new Map(), lessons: new Map(), roomBookings: new Map(),
    payments: new Map(), attendance: new Map(), attendanceQrSessions: new Map(), notifications: new Map(), assignments: new Map(),
    assignmentStudents: new Map(), assignmentSubmissions: new Map(), exams: new Map(), examQuestions: new Map(),
    examAttempts: new Map(), examAnswers: new Map(), examStudents: new Map(), broadcasts: new Map(),
    conversations: new Map(), messages: new Map(), ratings: new Map(), centerRatings: new Map(),
    wallets: new Map(), walletTransactions: new Map(), teacherSubjects: new Map(), teacherGrades: new Map(),
    teacherAvailabilities: new Map(), teacherPaymentSettings: new Map(), teacherStudents: new Map(),
    teacherAssistants: new Map(), studentSubjects: new Map(), parentStudents: new Map(),
    studentCenterFollows: new Map(), transportRoutes: new Map(), transportStudents: new Map(),
    expenses: new Map(), employeeTasks: new Map(), centerMessages: new Map(), settlements: new Map(),
    invoices: new Map(), documents: new Map(), groups: new Map(), groupEnrollments: new Map(),
    lessonEnrollments: new Map(), billingSubscriptions: new Map(), complaints: new Map(),
    centerRegistrationRequests: new Map(), activityLogs: new Map(), refreshTokens: new Map(),
    passwordResetTokens: new Map(), notificationTemplates: new Map(), phoneVerifications: new Map(),
    permissions: new Map(), rolePermissions: new Map(),
  };
  store = s;

  // Super admin
  const su = USER(1);
  s.users.set(su, { id: su, username: 'superadmin', passwordHash: h, fullName: 'Super Admin', phone: '+20 111 000 0000', photo: null, role: 'SUPER_ADMIN', status: 'ACTIVE', email: 'mostafa171@gmail.com', createdAt: today().toISOString(), updatedAt: today().toISOString(), centerId: null, phoneE164: '+201110000009', phoneVerified: true, phoneVerifiedAt: today().toISOString() });
  userByUsername.set('superadmin', su);

  // RBAC: Permission + RolePermission rows (mirrors seed.ts ROLE_PERMISSIONS)
  {
    const allPerms = [...new Set(Object.values(ROLE_PERMISSIONS).flat())];
    for (const name of allPerms) {
      const pid = `perm-${name.replace(/\./g, '-')}`;
      s.permissions.set(pid, { id: pid, name, description: null, domain: name.split('.')[0], createdAt: today().toISOString() });
    }
    for (const [role, names] of Object.entries(ROLE_PERMISSIONS)) {
      for (const name of names) {
        const pid = `perm-${name.replace(/\./g, '-')}`;
        const key = `${role}:${pid}`;
        s.rolePermissions.set(key, { role, permissionId: pid, createdAt: today().toISOString(), permission: s.permissions.get(pid) ?? null });
      }
    }
  }

  // Plans
  const plans = [
    { name: 'Tier 1', price: 600, maxTeachers: 6, maxStudents: 60, maxEmployees: 2, maxAssistants: 2, maxRooms: 4, commission: 0.05 },
    { name: 'Tier 2', price: 1000, maxTeachers: 12, maxStudents: 150, maxEmployees: 5, maxAssistants: 5, maxRooms: 8, commission: 0.04 },
    { name: 'Tier 3', price: 1800, maxTeachers: 25, maxStudents: 400, maxEmployees: 10, maxAssistants: 10, maxRooms: 15, commission: 0.03 },
  ];
  for (const p of plans) {
    const id = PL(plans.indexOf(p) + 1);
    s.subscriptionPlans.set(id, { id, name: p.name, description: `Plan ${p.name}`, priceMonthly: p.price, currency: 'EGP', maxTeachers: p.maxTeachers, maxStudents: p.maxStudents, maxEmployees: p.maxEmployees, maxAssistants: p.maxAssistants, maxRooms: p.maxRooms, commissionRate: p.commission, includesChat: true, includesExams: true, includesAssignments: true, includesAttendance: true, includesPayments: true, includesAnalytics: true, includesMultiBranch: false, isActive: true, billingPeriod: 'MONTHLY' as any, type: 'CENTER' as any, createdAt: today().toISOString(), updatedAt: today().toISOString() });
  }

  // Centers
  for (let i = 0; i < CENTERS.length; i++) {
    const c = CENTERS[i];
    const id = CN(i + 1);
    const plan = s.subscriptionPlans.get(PL(plans.findIndex(p => p.name === c.plan) + 1))!;
    s.centers.set(id, { id, name: c.name, nameEn: c.name, slug: c.slug, address: c.address, city: c.city, latitude: c.lat, longitude: c.lng, phone: c.phone, email: c.email, website: `https://${c.slug}.eg`, description: `Center in ${c.city}`, logoUrl: null, photos: null, shortDescription: null, workingHoursText: '08:00 - 20:00', equipment: null, status: 'ACTIVE' as any, subscriptionStatus: 'ACTIVE' as any, planId: plan.id, requiresApproval: false, approvedById: null, approvedAt: today().toISOString(), createdAt: today().toISOString(), updatedAt: today().toISOString(), cancelledAt: null, cancelledReason: null });
    centerBySlug.set(c.slug, id);
    s.centerSettings.set(CS(i + 1), { id: CS(i + 1), name: c.name, latitude: c.lat, longitude: c.lng, radiusMeters: 100, attendanceGraceMinutes: 10, timezone: 'Africa/Cairo', currency: 'EGP', navOrder: null, hiddenPages: null, escalation: null, comparisonMode: 'LAST_MONTH', updatedAt: today().toISOString(), centerId: id });
    // locations
    const locs = [{ name: `${c.name.split(' ')[0]} Branch`, address: c.address }, { name: 'Main Branch', address: c.address }];
    for (const l of locs) {
      const lid = LO(Math.floor(Math.random() * 9000) + 1000);
      s.locations.set(lid, { id: lid, name: l.name, address: l.address, createdAt: today().toISOString(), centerId: id });
    }
    // rooms
    for (let r = 0; r < 2; r++) {
      const rid = RM(i * 10 + r + 1);
      s.rooms.set(rid, { id: rid, name: `Room ${String.fromCharCode(65 + r)}`, centerId: id, locationId: [...s.locations.values()][0]?.id ?? null, capacity: 30, floor: '1', building: 'Main', status: 'ACTIVE' as any, createdAt: today().toISOString(), updatedAt: today().toISOString() });
    }
  }

  // Center admins
  for (let i = 0; i < CENTERS.length; i++) {
    const c = CENTERS[i];
    const uid = USER(10 + i + 1);
    s.users.set(uid, { id: uid, username: c.adminUsername, passwordHash: h, fullName: c.adminName, phone: c.adminPhone, photo: null, role: 'CENTER_ADMIN', status: 'ACTIVE', email: c.adminEmail, createdAt: today().toISOString(), updatedAt: today().toISOString(), centerId: CN(i + 1), phoneE164: c.adminPhone, phoneVerified: true, phoneVerifiedAt: today().toISOString() });
    userByUsername.set(c.adminUsername, uid);
  }

  // Employees (CENTER_EMPLOYEE role)
  const EMPLOYEES = [
    { username: 'demo.employee.1', fullName: 'Mahmoud Ramadan', phone: '+20 111 301 0001', center: 0 },
    { username: 'demo.employee.2', fullName: 'Ghada Ashraf', phone: '+20 111 301 0002', center: 1 },
    { username: 'demo.employee.3', fullName: 'Tarek Nasser', phone: '+20 111 301 0003', center: 2 },
  ];
  for (let i = 0; i < EMPLOYEES.length; i++) {
    const e = EMPLOYEES[i];
    const uid = USER(16 + i);
    const centerId = CN(e.center + 1);
    s.users.set(uid, { id: uid, username: e.username, passwordHash: h, fullName: e.fullName, phone: e.phone, photo: null, role: 'CENTER_EMPLOYEE', status: 'ACTIVE', email: `${e.username}@demo.eg`, createdAt: today().toISOString(), updatedAt: today().toISOString(), centerId, phoneE164: e.phone, phoneVerified: true, phoneVerifiedAt: today().toISOString() });
    userByUsername.set(e.username, uid);
  }

  // Teachers
  for (let i = 0; i < TEACHERS.length; i++) {
    const t = TEACHERS[i];
    const uid = USER(20 + i);
    const tid = TC(i + 1);
    const centerId = centerBySlug.get(t.centerSlug)!;
    s.users.set(uid, { id: uid, username: t.username, passwordHash: h, fullName: t.fullName, phone: t.phone, photo: null, role: 'TEACHER', status: 'ACTIVE', email: t.email, createdAt: today().toISOString(), updatedAt: today().toISOString(), centerId, phoneE164: t.phone, phoneVerified: true, phoneVerifiedAt: today().toISOString() });
    userByUsername.set(t.username, uid);
    teacherByUsername.set(t.username, tid);
    s.teachers.set(tid, { id: tid, userId: uid, bio: t.bio, yearsExperience: t.exp, hourlyRate: t.rate, locationId: null, createdAt: today().toISOString(), updatedAt: today().toISOString(), centerId });
    // subjects & grades
    for (const sn of t.subjects) {
      const sid = subjectByName.get(sn) ?? SB(Math.floor(Math.random() * 9000) + 1000);
      if (!subjectByName.has(sn)) { subjectByName.set(sn, sid); s.subjects.set(sid, { id: sid, name: sn, icon: null, description: null, createdAt: today().toISOString() }); }
      s.teacherSubjects.set(`ts-${tid}-${sid}`, { teacherId: tid, subjectId: sid, subject: s.subjects.get(sid), teacher: s.teachers.get(tid) });
    }
    for (const gn of t.grades) {
      const gid = gradeByName.get(gn) ?? GD(Math.floor(Math.random() * 9000) + 1000);
      if (!gradeByName.has(gn)) { gradeByName.set(gn, gid); s.grades.set(gid, { id: gid, name: gn, level: Math.floor((GRADES.indexOf(gn)) / 3) + 1, createdAt: today().toISOString() }); }
      s.teacherGrades.set(`tg-${tid}-${gid}`, { teacherId: tid, gradeId: gid, grade: s.grades.get(gid), teacher: s.teachers.get(tid) });
    }
    for (let a = 0; a < t.avail.length; a++) {
      const av = t.avail[a];
      s.teacherAvailabilities.set(`ta-${tid}-${a}`, { id: `ta-${tid}-${a}`, teacherId: tid, day: av.day, startTime: av.start, endTime: av.end, locationId: null, createdAt: today().toISOString(), location: null, teacher: s.teachers.get(tid) });
    }
    s.teacherPaymentSettings.set(tps(tid), { id: tps(tid), teacherId: tid, sessionEnabled: true, monthlyEnabled: true, sessionPrice: t.rate, monthlyPrice: t.rate * 8, vodafoneCash: '0100 000 0000', etisalatCash: null, orangeCash: null, instaPay: 'demo@instapay.eg', telda: null, createdAt: today().toISOString(), updatedAt: today().toISOString(), teacher: s.teachers.get(tid) });
    s.wallets.set(WAL(uid), { id: WAL(uid), userId: uid, balance: 0, currency: 'EGP', centerId, createdAt: today().toISOString(), updatedAt: today().toISOString(), status: 'ACTIVE' as any, center: s.centers.get(centerId), user: s.users.get(uid), transactions: [] });
    // teacherStudents links
    for (const stu of STUDENTS) {
      if (stu.teacherUsernames.includes(t.username)) {
        const stid = studentByUsername.get(stu.username)!;
        s.teacherStudents.set(`ts2-${tid}-${stid}`, { teacherId: tid, studentId: stid, createdAt: today().toISOString(), student: s.students.get(stid), teacher: s.teachers.get(tid) });
      }
    }
  }

  // Students + Parents
  for (let i = 0; i < STUDENTS.length; i++) {
    const st = STUDENTS[i];
    const uid = USER(50 + i);
    const sid = ST(i + 1);
    const centerId = centerBySlug.get(st.centerSlug)!;
    const gradeId = [...s.grades.values()].find(g => g.name === st.grade)?.id ?? GD(999);
    s.users.set(uid, { id: uid, username: st.username, passwordHash: h, fullName: st.fullName, phone: st.phone, photo: null, role: 'STUDENT', status: 'ACTIVE', email: st.email, createdAt: today().toISOString(), updatedAt: today().toISOString(), centerId, phoneE164: st.phone, phoneVerified: true, phoneVerifiedAt: today().toISOString() });
    userByUsername.set(st.username, uid);
    studentByUsername.set(st.username, sid);
    s.students.set(sid, { id: sid, userId: uid, gradeId, centerId, studentNumber: `STU-DEMO-${String(i + 1).padStart(3, '0')}`, createdAt: today().toISOString(), updatedAt: today().toISOString() });
    for (const sn of st.subjects) {
      const subjectId = subjectByName.get(sn) ?? SB(Math.floor(Math.random() * 9000) + 1000);
      if (!subjectByName.has(sn)) { subjectByName.set(sn, subjectId); s.subjects.set(subjectId, { id: subjectId, name: sn, icon: null, description: null, createdAt: today().toISOString() }); }
      s.studentSubjects.set(`ss-${sid}-${subjectId}`, { studentId: sid, subjectId });
    }
    for (const tu of st.teacherUsernames) {
      const tid = teacherByUsername.get(tu);
      if (tid) s.teacherStudents.set(`ts2-${tid}-${sid}`, { teacherId: tid, studentId: sid, createdAt: today().toISOString(), student: s.students.get(sid), teacher: s.teachers.get(tid) });
    }
    const parentIdx = PARENTS.findIndex((pm) => pm.username === st.parentUsername);
    if (parentIdx >= 0) {
      const parentId = PA(parentIdx + 1);
      s.parentStudents.set(`ps-${parentId}-${sid}`, { parentId, studentId: sid, createdAt: today().toISOString(), parent: s.parents.get(parentId), student: s.students.get(sid) });
    }
    for (const slug of st.followsCenters) {
      const cid = centerBySlug.get(slug);
      if (cid) s.studentCenterFollows.set(`scf-${sid}-${cid}`, { studentId: sid, centerId: cid, createdAt: today().toISOString(), student: s.students.get(sid), center: s.centers.get(cid) });
    }
    s.wallets.set(WAL(uid), { id: WAL(uid), userId: uid, balance: 500, currency: 'EGP', centerId, createdAt: today().toISOString(), updatedAt: today().toISOString(), status: 'ACTIVE' as any, center: s.centers.get(centerId), user: s.users.get(uid), transactions: [] });
  }

  // Parents
  for (let i = 0; i < PARENTS.length; i++) {
    const p = PARENTS[i];
    const uid = USER(80 + i);
    const pid = PA(i + 1);
    const centerId = centerBySlug.get(p.centerSlug) ?? null;
    s.users.set(uid, { id: uid, username: p.username, passwordHash: h, fullName: p.fullName, phone: p.phone, photo: null, role: 'PARENT', status: 'ACTIVE', email: p.email, createdAt: today().toISOString(), updatedAt: today().toISOString(), centerId, phoneE164: p.phone, phoneVerified: true, phoneVerifiedAt: today().toISOString() });
    userByUsername.set(p.username, uid);
    s.parents.set(pid, { id: pid, userId: uid, centerId, createdAt: today().toISOString(), updatedAt: today().toISOString() });
  }

  // ---------------- Generated data ----------------
  const allTeachers = [...s.teachers.values()];
  const allStudents = [...s.students.values()];
  const allCenters = [...s.centers.values()];

  // Lessons (25)
  const lessonStatuses: Array<'SCHEDULED' | 'COMPLETED' | 'CANCELLED'> = ['SCHEDULED', 'COMPLETED', 'CANCELLED'];
  for (let i = 0; i < 25; i++) {
    const t = allTeachers[i % allTeachers.length];
    const st = allStudents[i % allStudents.length];
    const c = s.centers.get(t.centerId)!;
    const subj = [...s.teacherSubjects.values()].find(x => x.teacherId === t.id)?.subjectId ?? [...s.subjects.values()][0]?.id;
    const date = daysFromNow((i % 5) - 2);
    s.lessons.set(LS(i + 1), { id: LS(i + 1), teacherId: t.id, studentId: st.id, subjectId: subj, date: date.toISOString(), startTime: `${10 + (i % 6)}:00`, endTime: `${11 + (i % 6)}:00`, locationId: null, status: lessonStatuses[i % 3], notes: null, centerId: t.centerId, capacity: null, roomId: null, createdAt: today().toISOString(), updatedAt: today().toISOString(), center: c, subject: subj ? s.subjects.get(subj) ?? null : null, teacher: t, student: s.students.get(st.id) ?? null, room: null, location: null });
  }

  // RoomBookings (15)
  for (let i = 0; i < 15; i++) {
    const t = allTeachers[i % allTeachers.length];
    const c = allCenters[i % allCenters.length];
    const room = [...s.rooms.values()].find(r => r.centerId === c.id) ?? [...s.rooms.values()][0];
    const date = daysFromNow(i % 7);
    const statuses: Array<'PENDING' | 'APPROVED' | 'CANCELLED' | 'COMPLETED'> = ['PENDING', 'APPROVED', 'CANCELLED', 'COMPLETED'];
    s.roomBookings.set(BK(i + 1), { id: BK(i + 1), centerId: c.id, roomId: room?.id ?? null, teacherId: t.id, groupId: null, date: date.toISOString(), dayOfWeek: date.getDay(), startTime: '10:00', endTime: '11:00', recurrence: 'ONE_TIME' as any, status: statuses[i % 4], note: null, createdAt: today().toISOString(), updatedAt: today().toISOString(), center: c, group: null, room, teacher: t });
  }

  // Payments (25)
  const payStatuses: Array<'PENDING' | 'PAID' | 'REJECTED' | 'EXPIRED' | 'REFUNDED' | 'COMPLETED'> = ['PAID', 'PAID', 'PAID', 'PENDING', 'PENDING', 'REJECTED', 'EXPIRED', 'REFUNDED'];
  const payMethods: Array<'VODAFONE_CASH' | 'ETISALAT_CASH' | 'ORANGE_CASH' | 'INSTAPAY' | 'TELDA' | 'CASH' | 'WALLET' | 'LATER'> = ['VODAFONE_CASH', 'ETISALAT_CASH', 'CASH', 'WALLET', 'INSTAPAY'];
  for (let i = 0; i < 25; i++) {
    const st = allStudents[i % allStudents.length];
    const t = allTeachers[i % allTeachers.length];
    const c = s.centers.get(t.centerId)!;
    const amount = [200, 400, 600, 800, 1000, 1200, 1500][i % 7];
    const status = payStatuses[i % payStatuses.length];
    s.payments.set(PAY(i + 1), { id: PAY(i + 1), paymentNumber: `PAY-${String(i + 1).padStart(6, '0')}`, payerId: st.userId, payerName: st.userId, studentId: st.id, parentId: null, teacherId: t.id, lessonId: null, subscriptionId: null, amount, currency: 'EGP', type: 'SESSION' as any, method: payMethods[i % payMethods.length], status: status as any, transactionReference: status === 'PAID' ? `TXN-${i}` : null, proofUrl: null, rejectionReason: status === 'REJECTED' ? 'Insufficient funds' : null, approvedById: status === 'PAID' ? 'admin' : null, paidAt: status === 'PAID' ? daysFromNow(-1).toISOString() : null, refundedAt: status === 'REFUNDED' ? daysFromNow(-1).toISOString() : null, refundAmount: status === 'REFUNDED' ? amount : null, refundedById: status === 'REFUNDED' ? 'admin' : null, createdAt: today().toISOString(), updatedAt: today().toISOString(), centerId: c.id, center: c, lesson: null, parent: null, student: s.students.get(st.id), billingSubscription: null, teacher: t, history: [] });
  }

  // Attendance (30)
  const attStatuses: Array<'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'> = ['PRESENT', 'PRESENT', 'PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
  for (let i = 0; i < 30; i++) {
    const st = allStudents[i % allStudents.length];
    const ls = allTeachers[i % allTeachers.length];
    const lesson = [...s.lessons.values()].find(l => l.teacherId === ls.id && l.studentId === st.id) ?? [...s.lessons.values()][i % s.lessons.size];
    s.attendance.set(ATT(i + 1), { id: ATT(i + 1), lessonId: lesson?.id ?? null, studentId: st.id, status: attStatuses[i % attStatuses.length], note: null, markedBy: ls.userId, createdAt: today().toISOString(), markedAt: today().toISOString(), method: 'MANUAL' as any, updatedAt: today().toISOString(), centerId: lesson?.centerId ?? null, center: null, lesson, student: s.students.get(st.id) });
  }

  // Notifications (25)
  const notifTypes = ['HOMEWORK', 'EXAM', 'LESSON_CHANGE', 'SYSTEM', 'GENERAL', 'RESULT', 'GRADED'];
  for (let i = 0; i < 25; i++) {
    const u = [...s.users.values()][i % s.users.size];
    s.notifications.set(NOT(i + 1), { id: NOT(i + 1), userId: u.id, type: notifTypes[i % notifTypes.length], title: `Notification ${i + 1}`, message: `Message for ${u.fullName}`, read: i % 3 === 0, broadcastId: null, createdAt: daysFromNow(-(i % 5)).toISOString(), user: s.users.get(u.id) });
  }

  // Assignments (6) + submissions
  for (let i = 0; i < 6; i++) {
    const t = allTeachers[i % allTeachers.length];
    const c = s.centers.get(t.centerId)!;
    const subj = [...s.teacherSubjects.values()].find(x => x.teacherId === t.id)?.subjectId ?? [...s.subjects.values()][0]?.id;
    const a = ASM(i + 1);
    s.assignments.set(a, { id: a, teacherId: t.id, subjectId: subj, title: `Assignment ${i + 1}`, description: `Description ${i + 1}`, attachment: null, deadline: daysFromNow(3 + i).toISOString(), createdAt: today().toISOString(), updatedAt: today().toISOString(), centerId: t.centerId, center: c, subject: subj ? s.subjects.get(subj) : null, teacher: t, students: [], submissions: [] });
    for (let j = 0; j < 3; j++) {
      const st = allStudents[(i * 3 + j) % allStudents.length];
      const asid = `${a}-${st.id}`;
      s.assignmentStudents.set(asid, { assignmentId: a, studentId: st.id });
      const subStatuses = ['SUBMITTED', 'GRADED', 'LATE', 'NOT_SUBMITTED'];
      const subStatus = subStatuses[(i + j) % subStatuses.length];
      s.assignmentSubmissions.set(`${ASM(100 + i)}-${st.id}`, { id: `${ASM(100 + i)}-${st.id}`, assignmentId: a, studentId: st.id, file: null, textAnswer: `Work ${i + 1}-${j + 1}`, submittedAt: daysFromNow(-2).toISOString(), grade: subStatus === 'GRADED' ? 15 + j * 3 : null, feedback: subStatus === 'GRADED' ? 'Good' : null, status: subStatus as any, gradedAt: subStatus === 'GRADED' ? daysFromNow(-1).toISOString() : null, createdAt: today().toISOString(), assignment: s.assignments.get(a), student: s.students.get(st.id) });
    }
  }

  // Exams (3) + attempts + questions
  for (let i = 0; i < 3; i++) {
    const t = allTeachers[i % allTeachers.length];
    const c = s.centers.get(t.centerId)!;
    const subj = [...s.teacherSubjects.values()].find(x => x.teacherId === t.id)?.subjectId ?? [...s.subjects.values()][0]?.id;
    const e = EX(i + 1);
    s.exams.set(e, { id: e, teacherId: t.id, subjectId: subj, name: `Exam ${i + 1}`, description: null, startTime: daysFromNow(-5 + i * 5).toISOString(), endTime: new Date(daysFromNow(-5 + i * 5).getTime() + 3600000).toISOString(), durationMinutes: 60, createdAt: today().toISOString(), updatedAt: today().toISOString(), centerId: t.centerId, center: c, subject: subj ? s.subjects.get(subj) : null, teacher: t, attempts: [], questions: [], students: [] });
    const q1 = `${EX(50)}-${i}`;
    s.examQuestions.set(q1, { id: q1, examId: e, type: 'MULTIPLE_CHOICE', question: `Question 1 of exam ${i + 1}`, options: JSON.stringify(['A', 'B', 'C', 'D']), correctAnswer: 'A', points: 5, order: 0, createdAt: today().toISOString(), answers: [], exam: s.exams.get(e) });
    const q2 = `${EX(60)}-${i}`;
    s.examQuestions.set(q2, { id: q2, examId: e, type: 'TRUE_FALSE', question: `True or false Q2`, options: null, correctAnswer: 'true', points: 5, order: 1, createdAt: today().toISOString(), answers: [], exam: s.exams.get(e) });
    for (let j = 0; j < 3; j++) {
      const st = allStudents[(i * 3 + j) % allStudents.length];
      s.examStudents.set(`es-${e}-${st.id}`, { examId: e, studentId: st.id, exam: s.exams.get(e), student: s.students.get(st.id) });
      const attStatus = ['SUBMITTED', 'SUBMITTED', 'IN_PROGRESS'][j] as any;
      const att = EXPT(i * 10 + j);
      s.examAttempts.set(att, { id: att, examId: e, studentId: st.id, startedAt: daysFromNow(-4).toISOString(), submittedAt: attStatus === 'SUBMITTED' ? daysFromNow(-3).toISOString() : null, score: attStatus === 'SUBMITTED' ? 8 + j : null, maxScore: 10, percentage: attStatus === 'SUBMITTED' ? 80 + j * 5 : null, correctCount: attStatus === 'SUBMITTED' ? 2 : 0, totalCount: 2, status: attStatus, createdAt: today().toISOString(), answers: [], exam: s.exams.get(e), student: s.students.get(st.id) });
    }
  }

  // Broadcasts (5)
  for (let i = 0; i < 5; i++) {
    const c = allCenters[i % allCenters.length];
    s.broadcasts.set(BC(i + 1), { id: BC(i + 1), centerId: c.id, audience: 'EMPLOYEES' as any, channel: 'APP' as any, subject: `Broadcast ${i + 1}`, message: `Message ${i + 1}`, status: 'SENT' as any, scheduledFor: null, sentAt: today().toISOString(), recipientCount: 10, readCount: 5, groupId: null, groupName: null, createdAt: today().toISOString(), updatedAt: today().toISOString(), center: c });
  }

  // Conversations (3) + messages
  for (let i = 0; i < 3; i++) {
    const t = allTeachers[i];
    const st = allStudents[i];
    const cv = CV(i + 1);
    s.conversations.set(cv, { id: cv, centerId: t.centerId, teacherId: t.id, studentId: st.id, createdAt: today().toISOString(), updatedAt: today().toISOString(), center: s.centers.get(t.centerId), student: s.students.get(st.id), teacher: s.teachers.get(t.id), messages: [] });
    for (let j = 0; j < 4; j++) {
      const mid = MS(i * 10 + j + 1);
      s.messages.set(mid, { id: mid, conversationId: cv, senderId: j % 2 === 0 ? t.userId : st.userId, senderRole: j % 2 === 0 ? 'TEACHER' : 'STUDENT', body: `Message ${j + 1} in conversation ${i + 1}`, read: j % 2 === 0, createdAt: daysFromNow(-j).toISOString(), conversation: s.conversations.get(cv) });
    }
  }

  // Ratings + CenterRatings
  for (let i = 0; i < 10; i++) {
    const t = allTeachers[i % allTeachers.length];
    const st = allStudents[i % allStudents.length];
    // Leave mock-tc-007 without ratings so the zero-review render path
    // (rating falls back to 0, review count hidden) is exercised in mock mode.
    if (t.id === 'mock-tc-007') continue;
    s.ratings.set(RT(i + 1), { id: RT(i + 1), teacherId: t.id, studentId: st.id, parentId: null, stars: [4, 5, 3, 5, 4][i % 5], comment: `Great teacher!`, createdAt: today().toISOString(), parent: null, student: s.students.get(st.id), teacher: s.teachers.get(t.id) });
  }
  for (let i = 0; i < 8; i++) {
    const c = allCenters[i % allCenters.length];
    const u = [...s.users.values()][i % s.users.size];
    s.centerRatings.set(CR(i + 1), { id: CR(i + 1), centerId: c.id, userId: u.id, stars: [4, 5, 3, 4, 5][i % 5], comment: 'Good center', createdAt: today().toISOString(), updatedAt: today().toISOString(), center: c, user: s.users.get(u.id) });
  }

  // TransportRoutes (3) + TransportStudents
  for (let i = 0; i < 3; i++) {
    const c = allCenters[i];
    s.transportRoutes.set(RT(i + 100), { id: RT(i + 100), centerId: c.id, name: `Route ${i + 1}`, areas: 'Downtown', driverName: `Driver ${i + 1}`, driverPhone: '+20 100 000 0000', vehicle: 'Van', capacity: 12, pickupTime: '07:00', dropoffTime: '15:00', status: 'ACTIVE' as any, createdAt: today().toISOString(), updatedAt: today().toISOString(), center: c, students: [] });
    for (let j = 0; j < 3; j++) {
      const st = allStudents[(i * 3 + j) % allStudents.length];
      s.transportStudents.set(`tsr-${i}-${j}`, { id: `tsr-${i}-${j}`, routeId: RT(i + 100), studentId: st.id, active: true, joinedAt: today().toISOString(), route: s.transportRoutes.get(RT(i + 100)), student: s.students.get(st.id) });
    }
  }

  // Expenses (5 per center)
  for (let i = 0; i < 5; i++) {
    const c = allCenters[i % allCenters.length];
    s.expenses.set(EXPT(i + 1), { id: EXPT(i + 1), centerId: c.id, title: `Expense ${i + 1}`, category: 'Supplies', amount: 500 + i * 200, date: daysFromNow(-i).toISOString(), note: null, createdBy: null, createdAt: today().toISOString(), updatedAt: today().toISOString(), center: c });
  }

  // EmployeeTasks (5 per center)
  for (let i = 0; i < 5; i++) {
    const c = allCenters[i % allCenters.length];
    s.employeeTasks.set(TSK(i + 1), { id: TSK(i + 1), centerId: c.id, assigneeId: null, title: `Task ${i + 1}`, description: null, status: ['OPEN', 'IN_PROGRESS', 'DONE'][i % 3] as any, dueAt: daysFromNow(3).toISOString(), completedAt: null, createdAt: today().toISOString(), updatedAt: today().toISOString(), assignee: null, center: c });
  }

  // CenterMessages (5)
  for (let i = 0; i < 5; i++) {
    const c = allCenters[i % allCenters.length];
    const sender = [...s.users.values()][i % s.users.size];
    s.centerMessages.set(CM(i + 1), { id: CM(i + 1), centerId: c.id, senderId: sender.id, recipientId: null, subject: `Message ${i + 1}`, message: `Body ${i + 1}`, read: i % 2 === 0, readAt: i % 2 === 0 ? today().toISOString() : null, createdAt: today().toISOString(), center: c, recipient: null, sender: s.users.get(sender.id) });
  }

  // Settlements (3)
  for (let i = 0; i < 3; i++) {
    const c = allCenters[i % allCenters.length];
    const t = allTeachers[i % allTeachers.length];
    s.settlements.set(STL(i + 1), { id: STL(i + 1), centerId: c.id, teacherId: t.id, period: `2026-${String(i + 1).padStart(2, '0')}`, grossAmount: 5000, platformCommission: 500, teacherShare: 4500, centerShare: 500, netAmount: 4500, status: 'PENDING' as any, settledAt: null, createdAt: today().toISOString(), updatedAt: today().toISOString(), notes: null, settlementNumber: `STL-${String(i + 1).padStart(4, '0')}`, center: c, teacher: t });
  }

  // Invoices (5)
  for (let i = 0; i < 5; i++) {
    const c = allCenters[i % allCenters.length];
    s.invoices.set(INV(i + 1), { id: INV(i + 1), invoiceNumber: `INV-${String(i + 1).padStart(6, '0')}`, paymentId: null, centerId: c.id, amount: 1000 + i * 500, currency: 'EGP', status: 'DRAFT' as any, issuedAt: null, paidAt: null, createdAt: today().toISOString(), updatedAt: today().toISOString(), description: null, dueAt: null, payerId: null, payerName: null, center: c, payment: null });
  }

  // Documents (5)
  for (let i = 0; i < 5; i++) {
    const u = [...s.users.values()][i % s.users.size];
    const c = u.centerId ? s.centers.get(u.centerId) : null;
    s.documents.set(DOC(i + 1), { id: DOC(i + 1), title: `Document ${i + 1}`, description: null, type: 'OTHER' as any, status: 'PENDING' as any, fileUrl: `/uploads/doc-${i + 1}.pdf`, mimeType: 'application/pdf', fileSize: 102400, ownerId: u.id, centerId: c?.id ?? null, verifiedById: null, verifiedAt: null, rejectionReason: null, expiresAt: null, createdAt: today().toISOString(), updatedAt: today().toISOString(), center: c, owner: s.users.get(u.id), verifiedBy: null });
  }

  // Groups (3) + enrollments
  for (let i = 0; i < 3; i++) {
    const c = allCenters[i % allCenters.length];
    const t = allTeachers[i % allTeachers.length];
    const subj = [...s.teacherSubjects.values()].find(x => x.teacherId === t.id)?.subjectId ?? [...s.subjects.values()][0]?.id;
    const room = [...s.rooms.values()].find(r => r.centerId === c.id);
    s.groups.set(GRP(i + 1), { id: GRP(i + 1), centerId: c.id, name: `Group ${i + 1}`, slug: `group-${i + 1}`, stage: 'Primary', subjectId: subj, teacherId: t.id, roomId: room?.id ?? null, branchId: null, capacity: 20, dayOfWeek: 1, startTime: '10:00', endTime: '11:30', status: 'ACTIVE' as any, notes: null, createdAt: today().toISOString(), updatedAt: today().toISOString(), branch: null, center: c, bookings: [], enrollments: [], room, subject: subj ? s.subjects.get(subj) : null, teacher: s.teachers.get(t.id) });
    for (let j = 0; j < 4; j++) {
      const st = allStudents[(i * 4 + j) % allStudents.length];
      s.groupEnrollments.set(GT(i * 10 + j), { id: GT(i * 10 + j), groupId: GRP(i + 1), studentId: st.id, status: 'ACTIVE' as any, notes: null, enrolledAt: today().toISOString(), group: s.groups.get(GRP(i + 1)), student: s.students.get(st.id) });
    }
  }

  // BillingSubscriptions (8)
  for (let i = 0; i < 8; i++) {
    const st = allStudents[i % allStudents.length];
    const t = allTeachers[i % allTeachers.length];
    const c = s.centers.get(t.centerId)!;
    const p = [...s.subscriptionPlans.values()][i % s.subscriptionPlans.size];
    s.billingSubscriptions.set(BS(i + 1), { id: BS(i + 1), studentId: st.id, parentId: null, teacherId: t.id, centerId: c.id, monthlyPrice: p.priceMonthly, startDate: today().toISOString(), endDate: daysFromNow(30).toISOString(), paymentMethod: null, status: 'ACTIVE' as any, createdAt: today().toISOString(), center: c, parent: null, student: s.students.get(st.id), teacher: s.teachers.get(t.id), payments: [] });
  }

  // Complaints (3)
  for (let i = 0; i < 3; i++) {
    const c = allCenters[i % allCenters.length];
    s.complaints.set(CP(i + 1), { id: CP(i + 1), centerId: c.id, code: `CMP-${String(i + 1).padStart(4, '0')}`, source: 'EXTERNAL' as any, severity: 'MEDIUM' as any, score: 0, subject: `Complaint ${i + 1}`, description: null, reporterName: null, assigneeId: null, status: 'OPEN' as any, internalAssessment: null, internalNotes: null, resolvedAt: null, createdAt: today().toISOString(), updatedAt: today().toISOString(), assignee: null, center: c });
  }

  // CenterRegistrationRequests (2)
  for (let i = 0; i < 2; i++) {
    const u = [...s.users.values()][10 + i];
    s.centerRegistrationRequests.set(CR(i + 1), { id: CR(i + 1), centerId: null, requesterId: u.id, status: 'PENDING' as any, reason: null, reviewNotes: null, reviewedById: null, reviewedAt: null, createdAt: today().toISOString(), updatedAt: today().toISOString(), center: null, requester: s.users.get(u.id) });
  }

  // ActivityLogs (10)
  for (let i = 0; i < 10; i++) {
    const u = [...s.users.values()][i % s.users.size];
    s.activityLogs.set(EXPT(200 + i), { id: EXPT(200 + i), userId: u.id, role: u.role, action: 'login', entity: 'User', entityId: u.id, details: null, category: 'OPERATIONS', result: 'SUCCESS', createdAt: daysFromNow(-i).toISOString(), centerId: u.centerId, user: s.users.get(u.id) });
  }

  // NotificationTemplates (3)
  for (let i = 0; i < 3; i++) {
    s.notificationTemplates.set(`nt-${i + 1}`, { id: `nt-${i + 1}`, key: ['homework', 'exam', 'general'][i], titleTemplate: `{action}`, bodyTemplate: 'Message', type: 'GENERAL' as any, isActive: true, createdAt: today().toISOString(), updatedAt: today().toISOString() });
  }

  // TeacherAssistants (3)
  for (let i = 0; i < 3; i++) {
    const t = allTeachers[i % allTeachers.length];
    const assistant = [...s.users.values()][(20 + i) % s.users.size];
    s.teacherAssistants.set(`ta-${t.id}-${assistant.id}`, { assistantId: assistant.id, teacherId: t.id, centerId: t.centerId, createdAt: today().toISOString(), assistant: s.users.get(assistant.id), center: t.centerId ? s.centers.get(t.centerId) : null, teacher: s.teachers.get(t.id) });
  }

  // LessonEnrollments (5)
  for (let i = 0; i < 5; i++) {
    const l = [...s.lessons.values()][i % s.lessons.size];
    const st = allStudents[i % allStudents.length];
    s.lessonEnrollments.set(LE(i + 1), { id: LE(i + 1), lessonId: l.id, studentId: st.id, status: 'ENROLLED' as any, enrolledAt: today().toISOString(), enrolledBy: null, createdAt: today().toISOString(), updatedAt: today().toISOString(), lesson: l, student: s.students.get(st.id) });
  }

  // AttendanceQrSessions (3)
  for (let i = 0; i < 3; i++) {
    const st = allStudents[i % allStudents.length];
    const l = [...s.lessons.values()][i % s.lessons.size];
    s.attendanceQrSessions.set(`aqs-${i + 1}`, { id: `aqs-${i + 1}`, studentId: st.id, lessonId: l?.id ?? null, tokenHash: `qr-${i}`, createdAt: today().toISOString(), expiresAt: daysFromNow(1).toISOString(), usedAt: null, revokedAt: null, ipAddress: null, userAgent: null, centerId: l?.centerId ?? null, center: null, lesson: l, student: s.students.get(st.id) });
  }

  console.log(`[mock-store] Seeded ${s.users.size} users, ${s.teachers.size} teachers, ${s.students.size} students, ${s.parents.size} parents, ${s.centers.size} centers, ${s.lessons.size} lessons, ${s.payments.size} payments, ${s.attendance.size} attendance, ${s.notifications.size} notifications, ${s.assignments.size} assignments, ${s.exams.size} exams, ${s.roomBookings.size} bookings, ${s.broadcasts.size} broadcasts, ${s.conversations.size} conversations, ${s.messages.size} messages`);
  return s;
}

export function getStore(): MockStore {
  if (!store) throw new Error('Mock store not initialized. Call seedStore() first.');
  return store;
}

// helpers
function tps(teacherId: string) { return `tps-${teacherId}`; }
function WAL(userId: string) { return `w-${userId}`; }