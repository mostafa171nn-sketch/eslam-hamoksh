import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../src/utils/password';
import { fileUrl } from '../src/middleware/upload';

const prisma = new PrismaClient();

const PASSWORD = 'Password123';

// Requested development/demo credentials for the MaaRech SaaS accounts.
const SUPERADMIN_PASSWORD = '7Amoksha@22';
const CENTERADMIN_PASSWORD = 'Center@123';
const TEACHER_PASSWORD = 'Teacher@123';
const STUDENT_PASSWORD = 'Student@123';
const PARENT_PASSWORD = 'Parent@123';

// ---------------------------------------------------------------------------
// Phase 1: RBAC Permissions
// ---------------------------------------------------------------------------

interface PermissionSeed {
  name: string;
  description: string;
  domain: string;
}

const PERMISSIONS: PermissionSeed[] = [
  // Centers
  { name: 'centers.view',       description: 'View centers',         domain: 'centers' },
  { name: 'centers.create',     description: 'Create centers',       domain: 'centers' },
  { name: 'centers.update',     description: 'Update center details', domain: 'centers' },
  { name: 'centers.delete',     description: 'Delete centers',       domain: 'centers' },
  { name: 'centers.approve',    description: 'Approve center registrations', domain: 'centers' },
  { name: 'centers.suspend',    description: 'Suspend centers',      domain: 'centers' },
  // Teachers
  { name: 'teachers.view',      description: 'View teachers',        domain: 'teachers' },
  { name: 'teachers.create',    description: 'Create teachers',      domain: 'teachers' },
  { name: 'teachers.update',    description: 'Update teacher details', domain: 'teachers' },
  { name: 'teachers.delete',    description: 'Delete teachers',      domain: 'teachers' },
  // Students
  { name: 'students.view',      description: 'View students',        domain: 'students' },
  { name: 'students.create',    description: 'Create students',      domain: 'students' },
  { name: 'students.update',    description: 'Update student details', domain: 'students' },
  { name: 'students.delete',    description: 'Delete students',      domain: 'students' },
  // Parents
  { name: 'parents.view',       description: 'View parents',         domain: 'parents' },
  { name: 'parents.create',     description: 'Create parents',       domain: 'parents' },
  { name: 'parents.update',     description: 'Update parent details', domain: 'parents' },
  { name: 'parents.delete',     description: 'Delete parents',       domain: 'parents' },
  // Lessons
  { name: 'lessons.view',       description: 'View lessons',         domain: 'lessons' },
  { name: 'lessons.create',     description: 'Create lessons',       domain: 'lessons' },
  { name: 'lessons.update',     description: 'Update lessons',       domain: 'lessons' },
  { name: 'lessons.delete',     description: 'Delete lessons',       domain: 'lessons' },
  // Attendance
  { name: 'attendance.view',    description: 'View attendance',      domain: 'attendance' },
  { name: 'attendance.mark',    description: 'Mark attendance',      domain: 'attendance' },
  { name: 'attendance.update',  description: 'Update attendance',    domain: 'attendance' },
  // Assignments
  { name: 'assignments.view',   description: 'View assignments',     domain: 'assignments' },
  { name: 'assignments.create', description: 'Create assignments',   domain: 'assignments' },
  { name: 'assignments.update', description: 'Update assignments',   domain: 'assignments' },
  { name: 'assignments.delete', description: 'Delete assignments',   domain: 'assignments' },
  { name: 'assignments.grade',  description: 'Grade submissions',    domain: 'assignments' },
  // Exams
  { name: 'exams.view',         description: 'View exams',           domain: 'exams' },
  { name: 'exams.create',       description: 'Create exams',         domain: 'exams' },
  { name: 'exams.update',       description: 'Update exams',         domain: 'exams' },
  { name: 'exams.delete',       description: 'Delete exams',         domain: 'exams' },
  { name: 'exams.grade',        description: 'Grade exam attempts',  domain: 'exams' },
  // Payments
  { name: 'payments.view',      description: 'View payments',        domain: 'payments' },
  { name: 'payments.create',    description: 'Create payments',      domain: 'payments' },
  { name: 'payments.update',    description: 'Update payment settings', domain: 'payments' },
  { name: 'payments.approve',   description: 'Approve payments',     domain: 'payments' },
  { name: 'payments.reject',    description: 'Reject payments',      domain: 'payments' },
  { name: 'payments.refund',    description: 'Refund payments',      domain: 'payments' },
  // Wallets
  { name: 'wallets.view',       description: 'View wallets',         domain: 'wallets' },
  { name: 'wallets.deposit',    description: 'Deposit to wallets',   domain: 'wallets' },
  { name: 'wallets.withdraw',   description: 'Withdraw from wallets', domain: 'wallets' },
  // Subscriptions
  { name: 'subscriptions.view',   description: 'View subscriptions',   domain: 'subscriptions' },
  { name: 'subscriptions.create', description: 'Create subscriptions', domain: 'subscriptions' },
  { name: 'subscriptions.update', description: 'Update subscriptions', domain: 'subscriptions' },
  { name: 'subscriptions.cancel', description: 'Cancel subscriptions', domain: 'subscriptions' },
  // Reports
  { name: 'reports.view',       description: 'View reports',         domain: 'reports' },
  { name: 'reports.export',     description: 'Export reports',       domain: 'reports' },
  { name: 'reports.financial.view', description: 'View financial reports', domain: 'reports' },
  { name: 'reports.attendance.view', description: 'View attendance reports', domain: 'reports' },
  { name: 'reports.student.view', description: 'View student reports', domain: 'reports' },
  { name: 'reports.teacher.view', description: 'View teacher reports', domain: 'reports' },
  // Settings
  { name: 'settings.view',      description: 'View center settings', domain: 'settings' },
  { name: 'settings.update',    description: 'Update center settings', domain: 'settings' },
  // Chat
  { name: 'chat.view',          description: 'View chat messages',   domain: 'chat' },
  { name: 'chat.send',          description: 'Send chat messages',   domain: 'chat' },
  // Locations
  { name: 'locations.view',     description: 'View locations',       domain: 'locations' },
  { name: 'locations.create',   description: 'Create locations',     domain: 'locations' },
  { name: 'locations.update',   description: 'Update locations',     domain: 'locations' },
  { name: 'locations.delete',   description: 'Delete locations',     domain: 'locations' },
  // Grades / Subjects
  { name: 'grades.view',        description: 'View grades',          domain: 'grades' },
  { name: 'grades.manage',      description: 'Manage grades',        domain: 'grades' },
  { name: 'subjects.view',      description: 'View subjects',        domain: 'subjects' },
  { name: 'subjects.manage',    description: 'Manage subjects',      domain: 'subjects' },
  // Settlements
  { name: 'settlements.view',   description: 'View settlements',     domain: 'settlements' },
  { name: 'settlements.process',description: 'Process settlements',  domain: 'settlements' },
  // Invoices
  { name: 'invoices.view',      description: 'View invoices',        domain: 'invoices' },
  { name: 'invoices.create',    description: 'Create invoices',      domain: 'invoices' },
  // Subscription Plans (SUPER_ADMIN platform plan management)
  { name: 'plans.view',         description: 'View subscription plans', domain: 'plans' },
  { name: 'plans.create',       description: 'Create subscription plans', domain: 'plans' },
  { name: 'plans.update',       description: 'Update subscription plans', domain: 'plans' },
  { name: 'plans.delete',       description: 'Delete subscription plans', domain: 'plans' },
  { name: 'plans.assign',       description: 'Assign plans to centers', domain: 'plans' },
  // Documents
  { name: 'documents.view',     description: 'View documents',         domain: 'documents' },
  { name: 'documents.create',   description: 'Upload documents',       domain: 'documents' },
  { name: 'documents.update',   description: 'Update documents',       domain: 'documents' },
  { name: 'documents.delete',   description: 'Delete documents',       domain: 'documents' },
  { name: 'documents.verify',   description: 'Verify/reject documents', domain: 'documents' },
];

// Role → permissions mapping.  Each role inherits all permissions from the
// roles below it (hierarchical).  Here we list only the *additional*
// permissions each role gets beyond its parent.
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    'centers.view', 'centers.create', 'centers.update', 'centers.delete',
    'centers.approve', 'centers.suspend',
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
    'reports.view', 'reports.export',
    'reports.financial.view', 'reports.attendance.view', 'reports.student.view', 'reports.teacher.view',
    'settings.view', 'settings.update',
    'chat.view', 'chat.send',
    'locations.view', 'locations.create', 'locations.update', 'locations.delete',
    'grades.view', 'grades.manage', 'subjects.view', 'subjects.manage',
    'settlements.view', 'settlements.process',
    'invoices.view', 'invoices.create',
    'plans.view', 'plans.create', 'plans.update', 'plans.delete', 'plans.assign',
    'documents.view', 'documents.create', 'documents.update', 'documents.delete', 'documents.verify',
  ],
  CENTER_ADMIN: [
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
    'reports.view', 'reports.export',
    'reports.financial.view', 'reports.attendance.view', 'reports.student.view', 'reports.teacher.view',
    'settings.view', 'settings.update',
    'chat.view', 'chat.send',
    'locations.view', 'locations.create', 'locations.update', 'locations.delete',
    'grades.view', 'grades.manage', 'subjects.view', 'subjects.manage',
    'settlements.view', 'settlements.process',
    'invoices.view', 'invoices.create',
    'documents.view', 'documents.create', 'documents.update', 'documents.delete', 'documents.verify',
  ],
  // Legacy ADMIN role — mirrors CENTER_ADMIN for backwards compatibility.
  // The auth layer treats ADMIN and CENTER_ADMIN as interchangeable; RBAC must too.
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
    'reports.view', 'reports.export',
    'reports.financial.view', 'reports.attendance.view', 'reports.student.view', 'reports.teacher.view',
    'settings.view', 'settings.update',
    'chat.view', 'chat.send',
    'locations.view', 'locations.create', 'locations.update', 'locations.delete',
    'grades.view', 'grades.manage', 'subjects.view', 'subjects.manage',
    'settlements.view', 'settlements.process',
    'invoices.view', 'invoices.create',
    'documents.view', 'documents.create', 'documents.update', 'documents.delete', 'documents.verify',
  ],
  CENTER_EMPLOYEE: [
    'teachers.view', 'students.view', 'parents.view',
    'lessons.view', 'attendance.view', 'attendance.mark',
    'assignments.view', 'exams.view',
    'payments.view', 'payments.create',
    'wallets.view',
    'subscriptions.view',
    'reports.view',
    'chat.view', 'chat.send',
    'locations.view',
    'grades.view', 'subjects.view',
    'documents.view', 'documents.create',
  ],
  RECEPTIONIST: [
    'teachers.view', 'students.view', 'students.create', 'students.update',
    'parents.view', 'parents.create', 'parents.update',
    'lessons.view',
    'payments.view', 'payments.create', 'payments.approve',
    'subscriptions.view', 'subscriptions.create',
    'chat.view',
    'grades.view', 'subjects.view',
    'documents.view', 'documents.create', 'documents.verify',
  ],
  TEACHER: [
    'students.view',
    'lessons.view', 'lessons.create', 'lessons.update',
    'attendance.view', 'attendance.mark',
    'assignments.view', 'assignments.create', 'assignments.update', 'assignments.grade',
    'exams.view', 'exams.create', 'exams.update', 'exams.grade',
    'payments.view', 'payments.update',
    'wallets.view',
    'chat.view', 'chat.send',
    'grades.view', 'subjects.view',
    'documents.view', 'documents.create',
  ],
  TEACHER_ASSISTANT: [
    'students.view',
    'lessons.view',
    'attendance.view', 'attendance.mark',
    'assignments.view', 'assignments.grade',
    'exams.view',
    'wallets.view',
    'chat.view',
    'grades.view', 'subjects.view',
    'documents.view', 'documents.create',
  ],
  STUDENT: [
    'lessons.view',
    'attendance.view',
    'assignments.view',
    'exams.view',
    'payments.view',
    'wallets.view',
    'chat.view', 'chat.send',
    'grades.view', 'subjects.view',
    'documents.view', 'documents.create',
  ],
  PARENT: [
    'students.view',
    'lessons.view',
    'attendance.view',
    'assignments.view',
    'exams.view',
    'payments.view', 'payments.create',
    'wallets.view',
    'chat.view', 'chat.send',
    'grades.view', 'subjects.view',
    'documents.view', 'documents.create',
  ],
};

// The single legacy tenant all seeded data belongs to. Created first so every
// subsequent record can be associated with a center (multi-tenant isolation).
let DEFAULT_CENTER_ID = '';

const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Arabic', 'History', 'Geography', 'Computer Science',
];

const GRADES = [
  'Grade 1 Primary', 'Grade 2 Primary', 'Grade 3 Primary', 'Grade 4 Primary', 'Grade 5 Primary', 'Grade 6 Primary',
  'Grade 1 Preparatory', 'Grade 2 Preparatory', 'Grade 3 Preparatory',
  'Grade 1 Secondary', 'Grade 2 Secondary', 'Grade 3 Secondary',
];

const LOCATIONS = [
  { name: 'Branch 1', address: '15 Tahrir Street, Downtown' },
  { name: 'Branch 2', address: '22 El-Maadi, Corniche Road' },
];

interface TeacherSeed {
  fullName: string; username: string; bio: string; subjects: string[]; grades: string[];
  yearsExperience: number; hourlyRate: number; location: string;
  availability: { day: number; startTime: string; endTime: string }[];
}

const TEACHERS: TeacherSeed[] = [
  { fullName: 'Mr. Ahmed Mohamed', username: 'ahmed.teacher',
    bio: 'Mathematics teacher with 7 years of experience. Specialist in secondary school mathematics and exam preparation.',
    subjects: ['Mathematics', 'Physics'], grades: ['Grade 1 Secondary', 'Grade 2 Secondary', 'Grade 3 Secondary'],
    yearsExperience: 7, hourlyRate: 150, location: 'Branch 1',
    availability: [{ day: 6, startTime: '16:00', endTime: '21:00' }, { day: 1, startTime: '17:00', endTime: '22:00' }, { day: 3, startTime: '16:00', endTime: '20:00' }] },
  { fullName: 'Mrs. Sara Hassan', username: 'sara.hassan',
    bio: 'Physics and Chemistry teacher passionate about making science fun for students.',
    subjects: ['Physics', 'Chemistry'], grades: ['Grade 2 Secondary', 'Grade 3 Secondary'],
    yearsExperience: 5, hourlyRate: 130, location: 'Branch 2',
    availability: [{ day: 0, startTime: '10:00', endTime: '15:00' }, { day: 2, startTime: '16:00', endTime: '21:00' }] },
  { fullName: 'Mr. Mohamed Ali', username: 'mohamed.ali',
    bio: 'English language expert. Prepares students for international exams.',
    subjects: ['English'], grades: ['Grade 1 Preparatory', 'Grade 2 Preparatory', 'Grade 3 Preparatory', 'Grade 1 Secondary', 'Grade 2 Secondary'],
    yearsExperience: 9, hourlyRate: 170, location: 'Branch 1',
    availability: [{ day: 6, startTime: '09:00', endTime: '14:00' }, { day: 1, startTime: '15:00', endTime: '19:00' }, { day: 4, startTime: '16:00', endTime: '21:00' }] },
  { fullName: 'Dr. Fatma Yousef', username: 'fatma.yousef',
    bio: 'PhD in Chemistry with 12 years of teaching experience. Great with advanced chemistry.',
    subjects: ['Chemistry', 'Biology'], grades: ['Grade 1 Secondary', 'Grade 2 Secondary', 'Grade 3 Secondary'],
    yearsExperience: 12, hourlyRate: 200, location: 'Branch 2',
    availability: [{ day: 0, startTime: '16:00', endTime: '20:00' }, { day: 3, startTime: '17:00', endTime: '22:00' }] },
  { fullName: 'Mr. Khaled Ibrahim', username: 'khaled.ibrahim',
    bio: 'Arabic and History teacher with a focus on interactive learning.',
    subjects: ['Arabic', 'History', 'Geography'], grades: ['Grade 1 Primary', 'Grade 2 Primary', 'Grade 3 Primary', 'Grade 4 Primary', 'Grade 5 Primary', 'Grade 6 Primary'],
    yearsExperience: 4, hourlyRate: 90, location: 'Branch 1',
    availability: [{ day: 5, startTime: '10:00', endTime: '16:00' }, { day: 2, startTime: '10:00', endTime: '14:00' }] },
  { fullName: 'Mr. Omar Nabil', username: 'omar.nabil',
    bio: 'Computer Science teacher. Teaches programming fundamentals and logic.',
    subjects: ['Computer Science', 'Mathematics'], grades: ['Grade 1 Secondary', 'Grade 2 Secondary', 'Grade 3 Secondary'],
    yearsExperience: 3, hourlyRate: 120, location: 'Branch 2',
    availability: [{ day: 6, startTime: '12:00', endTime: '18:00' }, { day: 4, startTime: '15:00', endTime: '20:00' }] },
];

interface StudentSeed { fullName: string; username: string; grade: string; subjects: string[]; teachers: string[]; parent?: string; }

const STUDENTS: StudentSeed[] = [
  { fullName: 'Ahmed Khalil', username: 'ahmed.student', grade: 'Grade 3 Secondary', subjects: ['Mathematics', 'Physics'], teachers: ['ahmed.teacher'], parent: 'khalil.family' },
  { fullName: 'Omar Khalil', username: 'omar.student', grade: 'Grade 1 Secondary', subjects: ['Mathematics', 'English'], teachers: ['ahmed.teacher', 'mohamed.ali'], parent: 'khalil.family' },
  { fullName: 'Sara Khalil', username: 'sara.student', grade: 'Grade 2 Preparatory', subjects: ['English', 'Science'], teachers: ['mohamed.ali'], parent: 'khalil.family' },
  { fullName: 'Youssef Mansour', username: 'youssef.mansour', grade: 'Grade 2 Secondary', subjects: ['Chemistry', 'Biology'], teachers: ['sara.hassan', 'fatma.yousef'], parent: 'mansour.family' },
  { fullName: 'Mariam Adel', username: 'mariam.adel', grade: 'Grade 3 Secondary', subjects: ['Physics', 'Chemistry'], teachers: ['sara.hassan'] },
  { fullName: 'Hassan Tarek', username: 'hassan.tarek', grade: 'Grade 3 Primary', subjects: ['Arabic', 'History'], teachers: ['khaled.ibrahim'] },
  { fullName: 'Laila Samir', username: 'laila.samir', grade: 'Grade 3 Secondary', subjects: ['Mathematics', 'Computer Science'], teachers: ['omar.nabil', 'ahmed.teacher'], parent: 'samir.family' },
];

const PARENTS = [
  { fullName: 'Mr. Khalil Mostafa', username: 'khalil.family' },
  { fullName: 'Mrs. Mona Mansour', username: 'mansour.family' },
  { fullName: 'Mr. Samir Fathy', username: 'samir.family' },
];

async function seedTenant() {
  const plan = await prisma.subscriptionPlan.upsert({
    where: { name: 'Standard' },
    create: {
      name: 'Standard',
      description: 'Full-feature plan for education centers.',
      type: 'CENTER',
      billingPeriod: 'MONTHLY',
      priceMonthly: 0,
      currency: 'EGP',
      includesChat: true, includesExams: true, includesAssignments: true,
      includesAttendance: true, includesPayments: true, includesAnalytics: true,
      includesMultiBranch: true, isActive: true,
    },
    update: { isActive: true },
  });

  const center = await prisma.center.upsert({
    where: { slug: 'main-center' },
    create: {
      name: 'Main Center', slug: 'main-center', city: 'Cairo', address: '15 Tahrir Street, Downtown',
      status: 'ACTIVE', subscriptionStatus: 'ACTIVE', requiresApproval: false, planId: plan.id,
    },
    update: {},
  });
  DEFAULT_CENTER_ID = center.id;

  await prisma.centerSettings.upsert({
    where: { centerId: center.id },
    create: { centerId: center.id, name: 'Main Center', timezone: 'Africa/Cairo', currency: 'EGP' },
    update: {},
  });

  // Platform super administrator (global access, no center).
  const superHash = await hashPassword(SUPERADMIN_PASSWORD);
  await prisma.user.upsert({
    where: { username: 'superadmin' },
    create: {
      username: 'superadmin',
      passwordHash: superHash,
      fullName: 'Super Admin',
      phone: '01000000009',
      email: 'superadmin@maarech.local',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
    update: {
      passwordHash: superHash,
      fullName: 'Super Admin',
      email: 'superadmin@maarech.local',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log(`Tenant: ${center.name} (${center.id}) | Plan: ${plan.name}`);
}

async function seedSubjects() {
  for (const name of SUBJECTS) {
    await prisma.subject.upsert({ where: { name }, create: { name }, update: {} });
  }
  console.log(`Subjects: ${SUBJECTS.length}`);
}

async function seedGrades() {
  for (const [i, name] of GRADES.entries()) {
    await prisma.grade.upsert({ where: { name }, create: { name, level: Math.floor(i / 3) + 1 }, update: {} });
  }
  console.log(`Grades: ${GRADES.length}`);
}

async function seedLocations() {
  for (const l of LOCATIONS) {
    await prisma.location.upsert({ where: { centerId_name: { centerId: DEFAULT_CENTER_ID, name: l.name } }, create: { ...l, centerId: DEFAULT_CENTER_ID }, update: {} });
  }
  console.log(`Locations: ${LOCATIONS.length}`);
}

async function seedAdmin() {
  const passwordHash = await hashPassword(PASSWORD);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    create: { username: 'admin', passwordHash, fullName: 'System Administrator', phone: '01000000000', role: 'CENTER_ADMIN', centerId: DEFAULT_CENTER_ID, status: 'ACTIVE' },
    update: { role: 'CENTER_ADMIN', centerId: DEFAULT_CENTER_ID },
  });
  console.log(`Admin: ${admin.username} / ${PASSWORD}`);
}

async function seedTeachers() {
  const allSubjects = await prisma.subject.findMany();
  const allGrades = await prisma.grade.findMany();
  const subjectByName = new Map(allSubjects.map((s) => [s.name, s]));
  const gradeByName = new Map(allGrades.map((g) => [g.name, g]));

  for (const t of TEACHERS) {
    const passwordHash = await hashPassword(PASSWORD);
    const existingUser = await prisma.user.findUnique({ where: { username: t.username } });
    let userId = existingUser?.id;
    if (!userId) {
      const user = await prisma.user.create({
        data: { username: t.username, passwordHash, fullName: t.fullName, phone: `0100${Math.floor(10000000 + Math.random() * 89999999)}`, role: 'TEACHER', centerId: DEFAULT_CENTER_ID },
      });
      userId = user.id;
    } else {
      await prisma.user.update({ where: { id: userId }, data: { centerId: DEFAULT_CENTER_ID } });
    }

    const location = await prisma.location.findUnique({ where: { centerId_name: { centerId: DEFAULT_CENTER_ID, name: t.location } } });
    const existing = await prisma.teacher.findUnique({ where: { userId } });
    if (existing) continue;

    await prisma.teacher.create({
      data: {
        userId, centerId: DEFAULT_CENTER_ID, bio: t.bio, yearsExperience: t.yearsExperience, hourlyRate: t.hourlyRate,
        locationId: location?.id ?? null,
        subjects: { create: t.subjects.map((name) => ({ subjectId: subjectByName.get(name)!.id })) },
        grades: { create: t.grades.map((name) => ({ gradeId: gradeByName.get(name)!.id })) },
        availability: { create: t.availability.map((a) => ({ day: a.day, startTime: a.startTime, endTime: a.endTime, locationId: location?.id ?? null })) },
      },
    });
  }
  console.log(`Teachers: ${TEACHERS.length}`);
}

async function seedStudentsAndParents() {
  const allSubjects = await prisma.subject.findMany();
  const subjectByName = new Map(allSubjects.map((s) => [s.name, s]));

  for (const p of PARENTS) {
    const passwordHash = await hashPassword(PASSWORD);
    const existingUser = await prisma.user.findUnique({ where: { username: p.username } });
    if (!existingUser) {
      const user = await prisma.user.create({ data: { username: p.username, passwordHash, fullName: p.fullName, phone: `0100${Math.floor(10000000 + Math.random() * 89999999)}`, role: 'PARENT', centerId: DEFAULT_CENTER_ID } });
      await prisma.parent.create({ data: { userId: user.id, centerId: DEFAULT_CENTER_ID } });
    }
  }
  console.log(`Parents: ${PARENTS.length}`);

  for (const s of STUDENTS) {
    const passwordHash = await hashPassword(PASSWORD);
    const existingUser = await prisma.user.findUnique({ where: { username: s.username } });
    let userId = existingUser?.id;
    if (!userId) {
      const user = await prisma.user.create({ data: { username: s.username, passwordHash, fullName: s.fullName, phone: `0100${Math.floor(10000000 + Math.random() * 89999999)}`, role: 'STUDENT', centerId: DEFAULT_CENTER_ID } });
      userId = user.id;
    } else {
      await prisma.user.update({ where: { id: userId }, data: { centerId: DEFAULT_CENTER_ID } });
    }

    const grade = await prisma.grade.findUnique({ where: { name: s.grade } });
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) {
      await prisma.student.create({
        data: {
          userId, centerId: DEFAULT_CENTER_ID,
          studentNumber: String(10_000_000 + Math.floor(Math.random() * 89_999_999)),
          gradeId: grade?.id ?? null,
          studentSubjects: { create: s.subjects.map((name) => subjectByName.get(name)).filter(Boolean).map((subject) => ({ subjectId: subject!.id })) },
        },
      });
    } else {
      await prisma.student.update({ where: { id: student.id }, data: { centerId: DEFAULT_CENTER_ID } });
    }
  }
  console.log(`Students: ${STUDENTS.length}`);

  for (const s of STUDENTS) {
    const studentUser = await prisma.user.findUnique({ where: { username: s.username } });
    if (!studentUser) continue;
    const student = await prisma.student.findUnique({ where: { userId: studentUser.id } });
    if (!student) continue;

    if (s.parent) {
      const parentUser = await prisma.user.findUnique({ where: { username: s.parent } });
      if (parentUser) {
        const parent = await prisma.parent.findUnique({ where: { userId: parentUser.id } });
        if (parent) {
          await prisma.parentStudent.upsert({ where: { parentId_studentId: { parentId: parent.id, studentId: student.id } }, create: { parentId: parent.id, studentId: student.id }, update: {} });
        }
      }
    }
    for (const teacherUsername of s.teachers) {
      const teacherUser = await prisma.user.findUnique({ where: { username: teacherUsername } });
      if (!teacherUser) continue;
      const teacher = await prisma.teacher.findUnique({ where: { userId: teacherUser.id } });
      if (teacher) {
        await prisma.teacherStudent.upsert({ where: { teacherId_studentId: { teacherId: teacher.id, studentId: student.id } }, create: { teacherId: teacher.id, studentId: student.id }, update: {} });
      }
    }
  }
}

async function seedLessons() {
  const teacherUser = await prisma.user.findUnique({ where: { username: 'ahmed.teacher' } });
  if (!teacherUser) return;
  const teacher = await prisma.teacher.findUnique({ where: { userId: teacherUser.id } });
  if (!teacher) return;

  const students = await prisma.student.findMany({ where: { teachers: { some: { teacherId: teacher.id } } }, include: { user: true } });
  const location = await prisma.location.findUnique({ where: { centerId_name: { centerId: DEFAULT_CENTER_ID, name: 'Branch 1' } } });
  const math = await prisma.subject.findUnique({ where: { name: 'Mathematics' } });
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekday = today.getDay();

  for (const [i, student] of students.entries()) {
    await prisma.lesson.create({ data: { teacherId: teacher.id, studentId: student.id, centerId: DEFAULT_CENTER_ID, subjectId: math?.id, date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000), startTime: '16:00', endTime: '17:30', locationId: location?.id ?? null, status: 'COMPLETED' } });
    const daysUntil = ((6 - weekday + 7) % 7) || 7;
    await prisma.lesson.create({ data: { teacherId: teacher.id, studentId: student.id, centerId: DEFAULT_CENTER_ID, subjectId: math?.id, date: new Date(today.getTime() + daysUntil * 24 * 60 * 60 * 1000), startTime: '16:00', endTime: '17:30', locationId: location?.id ?? null, status: 'SCHEDULED' } });
    if (i % 2 === 0) {
      await prisma.lesson.create({ data: { teacherId: teacher.id, studentId: student.id, centerId: DEFAULT_CENTER_ID, subjectId: math?.id, date: today, startTime: '18:00', endTime: '19:30', locationId: location?.id ?? null, status: 'SCHEDULED' } });
    }
  }
  console.log(`Lessons seeded for ${students.length} students.`);
}

async function seedRoomsAndGroupLessons() {
  const existingRooms = await prisma.room.count({ where: { centerId: DEFAULT_CENTER_ID } });
  if (existingRooms > 0) return;

  const location = await prisma.location.findUnique({
    where: { centerId_name: { centerId: DEFAULT_CENTER_ID, name: 'Branch 1' } },
  });

  const rooms = await Promise.all([
    prisma.room.create({
      data: {
        centerId: DEFAULT_CENTER_ID,
        locationId: location?.id ?? null,
        name: 'Room A1',
        capacity: 30,
        floor: '1',
        building: 'Main Building',
        status: 'ACTIVE',
      },
    }),
    prisma.room.create({
      data: {
        centerId: DEFAULT_CENTER_ID,
        locationId: location?.id ?? null,
        name: 'Room A2',
        capacity: 25,
        floor: '1',
        building: 'Main Building',
        status: 'ACTIVE',
      },
    }),
    prisma.room.create({
      data: {
        centerId: DEFAULT_CENTER_ID,
        locationId: location?.id ?? null,
        name: 'Lecture Hall B1',
        capacity: 60,
        floor: 'Ground',
        building: 'Main Building',
        status: 'ACTIVE',
      },
    }),
  ]);
  console.log(`Rooms seeded: ${rooms.length}`);

  const teacherUser = await prisma.user.findUnique({ where: { username: 'ahmed.teacher' } });
  if (!teacherUser) return;
  const teacher = await prisma.teacher.findUnique({ where: { userId: teacherUser.id } });
  if (!teacher) return;

  const students = await prisma.student.findMany({
    where: { teachers: { some: { teacherId: teacher.id } } },
    include: { user: true },
  });
  if (students.length < 2) return;

  const math = await prisma.subject.findUnique({ where: { name: 'Mathematics' } });
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekday = today.getDay();
  const daysUntilSaturday = ((6 - weekday + 7) % 7) || 7;

  const groupLesson = await prisma.lesson.create({
    data: {
      teacherId: teacher.id,
      studentId: null,
      centerId: DEFAULT_CENTER_ID,
      subjectId: math?.id,
      roomId: rooms[0].id,
      capacity: 5,
      date: new Date(today.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000),
      startTime: '10:00',
      endTime: '11:30',
      locationId: location?.id ?? null,
      status: 'SCHEDULED',
    },
  });

  const pastGroupLesson = await prisma.lesson.create({
    data: {
      teacherId: teacher.id,
      studentId: null,
      centerId: DEFAULT_CENTER_ID,
      subjectId: math?.id,
      roomId: rooms[1].id,
      capacity: 5,
      date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
      startTime: '10:00',
      endTime: '11:30',
      locationId: location?.id ?? null,
      status: 'COMPLETED',
    },
  });

  // Enroll first 3 students in upcoming group lesson
  const toEnroll = students.slice(0, 3);
  for (const student of toEnroll) {
    await prisma.lessonEnrollment.create({
      data: {
        lessonId: groupLesson.id,
        studentId: student.id,
        status: 'ENROLLED',
      },
    });
  }

  // Enroll 2 students in past group lesson with attendance
  const pastStudents = students.slice(0, 2);
  for (const [i, student] of pastStudents.entries()) {
    await prisma.lessonEnrollment.create({
      data: {
        lessonId: pastGroupLesson.id,
        studentId: student.id,
        status: 'COMPLETED',
      },
    });
    await prisma.attendance.create({
      data: {
        lessonId: pastGroupLesson.id,
        studentId: student.id,
        status: i === 0 ? 'PRESENT' : 'LATE',
        method: 'QR',
        markedBy: teacherUser.id,
        markedAt: new Date(pastGroupLesson.date.getTime() + 60 * 60 * 1000),
      },
    });
  }

  console.log(`Group lessons seeded: 2, enrollments: ${toEnroll.length + pastStudents.length}, attendance: ${pastStudents.length}.`);
}

async function seedAssignments() {
  const teacherUser = await prisma.user.findUnique({ where: { username: 'ahmed.teacher' } });
  if (!teacherUser) return;
  const teacher = await prisma.teacher.findUnique({ where: { userId: teacherUser.id } });
  if (!teacher) return;
  const count = await prisma.assignment.count({ where: { centerId: DEFAULT_CENTER_ID } });
  if (count > 0) return;

  const students = await prisma.student.findMany({ where: { teachers: { some: { teacherId: teacher.id } } } });
  const math = await prisma.subject.findUnique({ where: { name: 'Mathematics' } });
  const now = new Date();

  const pastAssignment = await prisma.assignment.create({ data: { teacherId: teacher.id, centerId: DEFAULT_CENTER_ID, subjectId: math?.id, title: 'Mathematics Homework #3', description: 'Solve exercises 1 to 20 from chapter 3 (Quadratic Equations).', deadline: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), students: { create: students.map((s) => ({ studentId: s.id })) } } });
  for (const [i, student] of students.entries()) {
    const status = i % 3 === 0 ? 'LATE' : i % 2 === 0 ? 'GRADED' : 'SUBMITTED';
    await prisma.assignmentSubmission.create({ data: { assignmentId: pastAssignment.id, studentId: student.id, textAnswer: `Solutions for exercises 1-20. (Student ${student.id.slice(0, 4)})`, submittedAt: new Date(pastAssignment.deadline.getTime() - 30 * 60 * 1000), status: status as any, grade: status === 'GRADED' ? 75 + ((i * 7) % 25) : undefined, feedback: status === 'GRADED' ? 'Well done! Review exercise 14 again.' : undefined } });
  }
  await prisma.assignment.create({ data: { teacherId: teacher.id, centerId: DEFAULT_CENTER_ID, subjectId: math?.id, title: 'Mathematics Homework #4', description: 'Solve exercises 21 to 40 from chapter 4 (Functions).', deadline: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), students: { create: students.map((s) => ({ studentId: s.id })) } } });
  console.log('Assignments seeded.');
}

async function seedExams() {
  const teacherUser = await prisma.user.findUnique({ where: { username: 'ahmed.teacher' } });
  if (!teacherUser) return;
  const teacher = await prisma.teacher.findUnique({ where: { userId: teacherUser.id } });
  if (!teacher) return;
  const count = await prisma.exam.count({ where: { centerId: DEFAULT_CENTER_ID } });
  if (count > 0) return;

  const students = await prisma.student.findMany({ where: { teachers: { some: { teacherId: teacher.id } } } });
  const math = await prisma.subject.findUnique({ where: { name: 'Mathematics' } });
  const now = new Date();

  const pastExam = await prisma.exam.create({ data: { teacherId: teacher.id, centerId: DEFAULT_CENTER_ID, subjectId: math?.id, name: 'Math Midterm', description: 'Midterm exam covering chapters 1-3.', startTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), endTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), durationMinutes: 60, students: { create: students.map((s) => ({ studentId: s.id })) }, questions: { create: [
    { type: 'MULTIPLE_CHOICE', question: '2 + 2 = ?', options: JSON.stringify(['3', '4', '5', '6']), correctAnswer: '4', points: 5, order: 0 },
    { type: 'MULTIPLE_CHOICE', question: 'What is the value of x if 2x = 10?', options: JSON.stringify(['3', '4', '5', '6']), correctAnswer: '5', points: 5, order: 1 },
    { type: 'TRUE_FALSE', question: 'The sum of the interior angles of a triangle is 180 degrees.', correctAnswer: 'true', points: 5, order: 2 },
    { type: 'TRUE_FALSE', question: 'A prime number is always even.', correctAnswer: 'false', points: 5, order: 3 },
  ] } } });

  const questions = await prisma.examQuestion.findMany({ where: { examId: pastExam.id }, orderBy: { order: 'asc' } });
  for (const [i, student] of students.entries()) {
    const attempt = await prisma.examAttempt.create({ data: { examId: pastExam.id, studentId: student.id, startedAt: new Date(pastExam.startTime.getTime() + i * 60000), submittedAt: new Date(pastExam.startTime.getTime() + i * 60000 + 35 * 60 * 1000), status: 'SUBMITTED' } });
    const correctAnswers = questions.map((q, qi) => { const correct = (i + qi) % 2 === 0; return { attemptId: attempt.id, questionId: q.id, answer: correct ? q.correctAnswer : q.type === 'TRUE_FALSE' ? (q.correctAnswer === 'true' ? 'false' : 'true') : null, isCorrect: correct, points: correct ? q.points : 0 }; });
    for (const a of correctAnswers) { if (a.answer === null) continue; await prisma.examAnswer.create({ data: a as any }); }
    const score = correctAnswers.filter((a) => a.isCorrect).reduce((sum, a) => sum + a.points, 0);
    const max = questions.reduce((sum, q) => sum + q.points, 0);
    await prisma.examAttempt.update({ where: { id: attempt.id }, data: { score, maxScore: max, percentage: max > 0 ? (score / max) * 100 : 0, correctCount: correctAnswers.filter((a) => a.isCorrect).length, totalCount: questions.length } });
  }
  await prisma.exam.create({ data: { teacherId: teacher.id, centerId: DEFAULT_CENTER_ID, subjectId: math?.id, name: 'Math Final - Chapter 4', description: 'Final exam covering chapter 4 (Functions).', startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), durationMinutes: 60, students: { create: students.map((s) => ({ studentId: s.id })) }, questions: { create: [
    { type: 'MULTIPLE_CHOICE', question: 'If f(x) = 2x + 3, what is f(2)?', options: JSON.stringify(['5', '6', '7', '8']), correctAnswer: '7', points: 5, order: 0 },
    { type: 'MULTIPLE_CHOICE', question: 'The range of f(x) = x^2 is:', options: JSON.stringify(['All real numbers', 'Non-negative real numbers', 'Positive real numbers', 'Negative real numbers']), correctAnswer: 'Non-negative real numbers', points: 5, order: 1 },
    { type: 'TRUE_FALSE', question: 'A linear function has a constant rate of change.', correctAnswer: 'true', points: 5, order: 2 },
  ] } } });
  console.log('Exams seeded.');
}

async function seedRatings() {
  const teacherUser = await prisma.user.findUnique({ where: { username: 'ahmed.teacher' } });
  if (!teacherUser) return;
  const teacher = await prisma.teacher.findUnique({ where: { userId: teacherUser.id } });
  if (!teacher) return;
  const count = await prisma.rating.count();
  if (count > 0) return;

  const students = await prisma.student.findMany({ where: { teachers: { some: { teacherId: teacher.id } } } });
  const reviews = [
    { stars: 5, comment: 'Excellent teacher! Very clear explanations.' },
    { stars: 4, comment: 'Great at explaining difficult concepts.' },
    { stars: 5, comment: 'My son improved a lot. Highly recommended.' },
    { stars: 4, comment: 'Very patient and organized.' },
    { stars: 5, comment: 'Best math teacher we have tried.' },
  ];
  for (const [i, student] of students.entries()) {
    const r = reviews[i % reviews.length];
    await prisma.rating.create({ data: { teacherId: teacher.id, studentId: student.id, stars: r.stars, comment: r.comment } });
  }
  const parent = await prisma.parent.findFirst({ include: { user: true } });
  if (parent) {
    await prisma.rating.create({ data: { teacherId: teacher.id, parentId: parent.id, stars: 5, comment: 'Very professional teacher. My child is doing great.' } });
  }
  console.log(`Ratings seeded.`);
}

async function seedTestAccounts() {
  const plan = await prisma.subscriptionPlan.upsert({
    where: { name: 'Standard' },
    create: {
      name: 'Standard',
      description: 'Full-feature plan for education centers.',
      type: 'CENTER',
      billingPeriod: 'MONTHLY',
      priceMonthly: 0,
      currency: 'EGP',
      includesChat: true, includesExams: true, includesAssignments: true,
      includesAttendance: true, includesPayments: true, includesAnalytics: true,
      includesMultiBranch: true, isActive: true,
    },
    update: { isActive: true },
  });

  // Dedicated development/test center (active + subscribed so the app works).
  const center = await prisma.center.upsert({
    where: { slug: 'maarech-test-center' },
    create: {
      name: 'Maaarech Test Center',
      nameEn: 'Maaarech Test Center',
      slug: 'maarech-test-center',
      city: 'Cairo',
      address: '1 Test Street, New Cairo',
      status: 'ACTIVE',
      subscriptionStatus: 'ACTIVE',
      requiresApproval: false,
      planId: plan.id,
    },
    update: { status: 'ACTIVE', subscriptionStatus: 'ACTIVE' },
  });
  await prisma.centerSettings.upsert({
    where: { centerId: center.id },
    create: { centerId: center.id, name: 'Maaarech Test Center', timezone: 'Africa/Cairo', currency: 'EGP' },
    update: {},
  });

  const superHash = await hashPassword(SUPERADMIN_PASSWORD);
  await prisma.user.upsert({
    where: { username: 'superadmin' },
    create: {
      username: 'superadmin', passwordHash: superHash, fullName: 'Super Admin', phone: '01000000009',
      email: 'mostafa171@gmail.com', role: 'SUPER_ADMIN', status: 'ACTIVE',
    },
    update: { passwordHash: superHash, fullName: 'Super Admin', email: 'mostafa171@gmail.com', role: 'SUPER_ADMIN', status: 'ACTIVE' },
  });

  const centerAdminHash = await hashPassword(CENTERADMIN_PASSWORD);
  await prisma.user.upsert({
    where: { username: 'centeradmin' },
    create: {
      username: 'centeradmin', passwordHash: centerAdminHash, fullName: 'Center Administrator', phone: '01000000010',
      email: 'centeradmin@maarech.demo', role: 'CENTER_ADMIN', status: 'ACTIVE', centerId: center.id,
    },
    update: { passwordHash: centerAdminHash, centerId: center.id, status: 'ACTIVE', email: 'centeradmin@maarech.demo' },
  });

  const subjects = await prisma.subject.findMany({ where: { name: { in: ['Mathematics', 'Physics'] } } });
  const grades = await prisma.grade.findMany({ where: { name: { in: ['Grade 1 Secondary', 'Grade 2 Secondary', 'Grade 3 Secondary'] } } });

  const teacherHash = await hashPassword(TEACHER_PASSWORD);
  const teacherUser = await prisma.user.upsert({
    where: { username: 'teacher1' },
    create: {
      username: 'teacher1', passwordHash: teacherHash, fullName: 'Test Teacher', phone: '01000000011',
      email: 'teacher1@maarech.local', role: 'TEACHER', status: 'ACTIVE', centerId: center.id,
    },
    update: { passwordHash: teacherHash, centerId: center.id, status: 'ACTIVE', email: 'teacher1@maarech.local' },
  });
  if (!await prisma.teacher.findUnique({ where: { userId: teacherUser.id } })) {
    await prisma.teacher.create({
      data: {
        userId: teacherUser.id, centerId: center.id, bio: 'Test teacher account.', yearsExperience: 3, hourlyRate: 120,
        subjects: { create: subjects.map((s) => ({ subjectId: s.id })) },
        grades: { create: grades.map((g) => ({ gradeId: g.id })) },
      },
    });
  }

  // Demo teacher (ahmed.teacher) — connected to the demo center.
  const demoTeacherHash = await hashPassword(TEACHER_PASSWORD);
  const demoTeacherUser = await prisma.user.upsert({
    where: { username: 'ahmed.teacher' },
    create: {
      username: 'ahmed.teacher', passwordHash: demoTeacherHash, fullName: 'Ahmed Teacher', phone: '01000000021',
      email: 'ahmed.teacher@maarech.demo', role: 'TEACHER', status: 'ACTIVE', centerId: center.id,
    },
    update: { passwordHash: demoTeacherHash, centerId: center.id, status: 'ACTIVE', email: 'ahmed.teacher@maarech.demo' },
  });
  await prisma.teacher.upsert({
    where: { userId: demoTeacherUser.id },
    create: {
      userId: demoTeacherUser.id, centerId: center.id, bio: 'Demo teacher account.', yearsExperience: 7, hourlyRate: 150,
      subjects: { create: subjects.map((s) => ({ subjectId: s.id })) },
      grades: { create: grades.map((g) => ({ gradeId: g.id })) },
    },
    update: { centerId: center.id },
  });

  const grade1 = await prisma.grade.findFirst({ where: { name: 'Grade 1 Secondary' } });
  const studentSubjects = await prisma.subject.findMany({ where: { name: { in: ['Mathematics', 'English'] } } });
  const studentHash = await hashPassword(STUDENT_PASSWORD);
  const studentUser = await prisma.user.upsert({
    where: { username: 'student1' },
    create: {
      username: 'student1', passwordHash: studentHash, fullName: 'Test Student', phone: '01000000012',
      email: 'student1@maarech.local', role: 'STUDENT', status: 'ACTIVE', centerId: center.id,
    },
    update: { passwordHash: studentHash, centerId: center.id, status: 'ACTIVE', email: 'student1@maarech.local' },
  });
  if (!await prisma.student.findUnique({ where: { userId: studentUser.id } })) {
    let studentNumber = '';
    for (let i = 0; i < 10; i++) {
      const candidate = `STU-${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`;
      if (!await prisma.student.findUnique({ where: { studentNumber: candidate } })) { studentNumber = candidate; break; }
    }
    if (!studentNumber) throw new Error('Could not allocate a student number for test student.');
    await prisma.student.create({
      data: {
        userId: studentUser.id, centerId: center.id, studentNumber, gradeId: grade1?.id ?? null,
        studentSubjects: { create: studentSubjects.map((s) => ({ subjectId: s.id })) },
      },
    });
  }

  // Demo student (ahmed.student) — connected to the demo center.
  const demoStudentHash = await hashPassword(STUDENT_PASSWORD);
  const demoStudentUser = await prisma.user.upsert({
    where: { username: 'ahmed.student' },
    create: {
      username: 'ahmed.student', passwordHash: demoStudentHash, fullName: 'Ahmed Student', phone: '01000000022',
      email: 'ahmed.student@maarech.demo', role: 'STUDENT', status: 'ACTIVE', centerId: center.id,
    },
    update: { passwordHash: demoStudentHash, centerId: center.id, status: 'ACTIVE', email: 'ahmed.student@maarech.demo' },
  });
  let demoStudentNumber = '';
  for (let i = 0; i < 10; i++) {
    const candidate = `STU-${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`;
    if (!await prisma.student.findUnique({ where: { studentNumber: candidate } })) { demoStudentNumber = candidate; break; }
  }
  if (!demoStudentNumber) throw new Error('Could not allocate student number for demo student.');
  await prisma.student.upsert({
    where: { userId: demoStudentUser.id },
    create: {
      userId: demoStudentUser.id, centerId: center.id, studentNumber: demoStudentNumber, gradeId: grade1?.id ?? null,
      studentSubjects: { create: studentSubjects.map((s) => ({ subjectId: s.id })) },
    },
    update: { centerId: center.id },
  });

  const parentHash = await hashPassword(PARENT_PASSWORD);
  const parentUser = await prisma.user.upsert({
    where: { username: 'parent1' },
    create: {
      username: 'parent1', passwordHash: parentHash, fullName: 'Test Parent', phone: '01000000013',
      email: 'parent1@maarech.local', role: 'PARENT', status: 'ACTIVE', centerId: center.id,
    },
    update: { passwordHash: parentHash, centerId: center.id, status: 'ACTIVE', email: 'parent1@maarech.local' },
  });
  if (!await prisma.parent.findUnique({ where: { userId: parentUser.id } })) {
    await prisma.parent.create({ data: { userId: parentUser.id, centerId: center.id } });
  }

  // Demo parent (ahmed.parent) — connected to the demo center, linked to ahmed.student.
  const demoParentHash = await hashPassword(PARENT_PASSWORD);
  const demoParentUser = await prisma.user.upsert({
    where: { username: 'ahmed.parent' },
    create: {
      username: 'ahmed.parent', passwordHash: demoParentHash, fullName: 'Ahmed Parent', phone: '01000000023',
      email: 'ahmed.parent@maarech.demo', role: 'PARENT', status: 'ACTIVE', centerId: center.id,
    },
    update: { passwordHash: demoParentHash, centerId: center.id, status: 'ACTIVE', email: 'ahmed.parent@maarech.demo' },
  });
  await prisma.parent.upsert({
    where: { userId: demoParentUser.id },
    create: { userId: demoParentUser.id, centerId: center.id },
    update: { centerId: center.id },
  });

  const demoStudentRec = await prisma.student.findUnique({ where: { userId: demoStudentUser.id } });
  const demoParentRec = await prisma.parent.findUnique({ where: { userId: demoParentUser.id } });
  if (demoStudentRec && demoParentRec) {
    await prisma.parentStudent.upsert({
      where: { parentId_studentId: { parentId: demoParentRec.id, studentId: demoStudentRec.id } },
      create: { parentId: demoParentRec.id, studentId: demoStudentRec.id },
      update: {},
    });
  }

  const studentRec = await prisma.student.findUnique({ where: { userId: studentUser.id } });
  const parentRec = await prisma.parent.findUnique({ where: { userId: parentUser.id } });
  if (studentRec && parentRec) {
    await prisma.parentStudent.upsert({
      where: { parentId_studentId: { parentId: parentRec.id, studentId: studentRec.id } },
      create: { parentId: parentRec.id, studentId: studentRec.id },
      update: {},
    });
  }

  // Demo assistant (assistant1) — linked to ahmed.teacher via TeacherAssistant junction.
  const assistantHash = await hashPassword(PASSWORD);
  const assistantUser = await prisma.user.upsert({
    where: { username: 'assistant1' },
    create: {
      username: 'assistant1', passwordHash: assistantHash, fullName: 'Test Assistant', phone: '01000000014',
      email: 'assistant1@maarech.demo', role: 'TEACHER_ASSISTANT', status: 'ACTIVE', centerId: center.id,
    },
    update: { passwordHash: assistantHash, centerId: center.id, status: 'ACTIVE' },
  });

  // Link assistant to ahmed.teacher
  const demoTeacherRec = await prisma.teacher.findUnique({ where: { userId: demoTeacherUser.id } });
  if (demoTeacherRec) {
    await prisma.teacherAssistant.upsert({
      where: { assistantId_teacherId: { assistantId: assistantUser.id, teacherId: demoTeacherRec.id } },
      create: { assistantId: assistantUser.id, teacherId: demoTeacherRec.id, centerId: center.id },
      update: {},
    });
  }

  console.log(`Demo accounts: center=${center.name} (${center.id}) | superadmin, centeradmin, ahmed.teacher, ahmed.student, ahmed.parent, assistant1`);
}

// ---------------------------------------------------------------------------
// Phase 1: Seed permissions and role-permission mappings
// ---------------------------------------------------------------------------

async function seedPermissions() {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: p.name },
      create: { name: p.name, description: p.description, domain: p.domain },
      update: { description: p.description, domain: p.domain },
    });
  }
  console.log(`Permissions: ${PERMISSIONS.length}`);
}

async function seedRolePermissions() {
  let count = 0;
  for (const [role, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
    for (const permName of permissionNames) {
      const perm = await prisma.permission.findUnique({ where: { name: permName } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role, permissionId: perm.id } },
        create: { role, permissionId: perm.id },
        update: {},
      });
      count++;
    }
  }
  console.log(`Role-permission mappings: ${count}`);
}

async function seedSubscriptionPlans() {
  const plans = [
    // ── CENTER plans ────────────────────────────────────────────────────
    {
      name: 'Small',
      description: 'Entry-level plan for small education centers.',
      type: 'CENTER' as const,
      billingPeriod: 'MONTHLY' as const,
      priceMonthly: 300,
      currency: 'EGP',
      maxTeachers: 3,
      maxStudents: 30,
      maxEmployees: 1,
      maxAssistants: 1,
      maxRooms: 2,
      commissionRate: 0.05,
      includesChat: true,
      includesExams: false,
      includesAssignments: false,
      includesAttendance: true,
      includesPayments: true,
      includesAnalytics: false,
      includesMultiBranch: false,
      isActive: true,
    },
    {
      name: 'Tier 1',
      description: 'Plan for growing education centers.',
      type: 'CENTER' as const,
      billingPeriod: 'MONTHLY' as const,
      priceMonthly: 600,
      currency: 'EGP',
      maxTeachers: 6,
      maxStudents: 60,
      maxEmployees: 2,
      maxAssistants: 2,
      maxRooms: 4,
      commissionRate: 0.05,
      includesChat: true,
      includesExams: true,
      includesAssignments: true,
      includesAttendance: true,
      includesPayments: true,
      includesAnalytics: false,
      includesMultiBranch: false,
      isActive: true,
    },
    {
      name: 'Tier 2',
      description: 'Plan for medium education centers.',
      type: 'CENTER' as const,
      billingPeriod: 'MONTHLY' as const,
      priceMonthly: 1000,
      currency: 'EGP',
      maxTeachers: 12,
      maxStudents: 150,
      maxEmployees: 5,
      maxAssistants: 5,
      maxRooms: 8,
      commissionRate: 0.04,
      includesChat: true,
      includesExams: true,
      includesAssignments: true,
      includesAttendance: true,
      includesPayments: true,
      includesAnalytics: true,
      includesMultiBranch: false,
      isActive: true,
    },
    {
      name: 'Tier 3',
      description: 'Plan for large education centers.',
      type: 'CENTER' as const,
      billingPeriod: 'MONTHLY' as const,
      priceMonthly: 1800,
      currency: 'EGP',
      maxTeachers: 25,
      maxStudents: 400,
      maxEmployees: 10,
      maxAssistants: 10,
      maxRooms: 15,
      commissionRate: 0.03,
      includesChat: true,
      includesExams: true,
      includesAssignments: true,
      includesAttendance: true,
      includesPayments: true,
      includesAnalytics: true,
      includesMultiBranch: false,
      isActive: true,
    },
    {
      name: 'Tier 4',
      description: 'Plan for very large education centers.',
      type: 'CENTER' as const,
      billingPeriod: 'MONTHLY' as const,
      priceMonthly: 3000,
      currency: 'EGP',
      maxTeachers: 50,
      maxStudents: 1000,
      maxEmployees: 20,
      maxAssistants: 20,
      maxRooms: 30,
      commissionRate: 0.02,
      includesChat: true,
      includesExams: true,
      includesAssignments: true,
      includesAttendance: true,
      includesPayments: true,
      includesAnalytics: true,
      includesMultiBranch: true,
      isActive: true,
    },
    {
      name: 'Tier 5',
      description: 'Enterprise plan for multi-branch education networks.',
      type: 'CENTER' as const,
      billingPeriod: 'MONTHLY' as const,
      priceMonthly: 5000,
      currency: 'EGP',
      maxTeachers: null,
      maxStudents: null,
      maxEmployees: null,
      maxAssistants: null,
      maxRooms: null,
      commissionRate: 0.01,
      includesChat: true,
      includesExams: true,
      includesAssignments: true,
      includesAttendance: true,
      includesPayments: true,
      includesAnalytics: true,
      includesMultiBranch: true,
      isActive: true,
    },
    // ── TEACHER plans ───────────────────────────────────────────────────
    {
      name: 'Faseeh',
      description: 'Basic plan for individual teachers.',
      type: 'TEACHER' as const,
      billingPeriod: 'MONTHLY' as const,
      priceMonthly: 50,
      currency: 'EGP',
      maxStudents: 10,
      commissionRate: 0.0,
      includesChat: true,
      includesExams: false,
      includesAssignments: false,
      includesAttendance: true,
      includesPayments: true,
      includesAnalytics: false,
      includesMultiBranch: false,
      isActive: true,
    },
    {
      name: 'Silver',
      description: 'Standard plan for individual teachers.',
      type: 'TEACHER' as const,
      billingPeriod: 'MONTHLY' as const,
      priceMonthly: 100,
      currency: 'EGP',
      maxStudents: 25,
      commissionRate: 0.0,
      includesChat: true,
      includesExams: true,
      includesAssignments: true,
      includesAttendance: true,
      includesPayments: true,
      includesAnalytics: false,
      includesMultiBranch: false,
      isActive: true,
    },
    {
      name: 'Gold',
      description: 'Premium plan for established teachers.',
      type: 'TEACHER' as const,
      billingPeriod: 'MONTHLY' as const,
      priceMonthly: 200,
      currency: 'EGP',
      maxStudents: 50,
      commissionRate: 0.0,
      includesChat: true,
      includesExams: true,
      includesAssignments: true,
      includesAttendance: true,
      includesPayments: true,
      includesAnalytics: true,
      includesMultiBranch: false,
      isActive: true,
    },
    {
      name: 'Diamond',
      description: 'Professional plan for high-volume teachers.',
      type: 'TEACHER' as const,
      billingPeriod: 'MONTHLY' as const,
      priceMonthly: 350,
      currency: 'EGP',
      maxStudents: 100,
      commissionRate: 0.0,
      includesChat: true,
      includesExams: true,
      includesAssignments: true,
      includesAttendance: true,
      includesPayments: true,
      includesAnalytics: true,
      includesMultiBranch: false,
      isActive: true,
    },
    {
      name: 'Platinum',
      description: 'Elite plan for top-performing teachers.',
      type: 'TEACHER' as const,
      billingPeriod: 'MONTHLY' as const,
      priceMonthly: 500,
      currency: 'EGP',
      maxStudents: 200,
      commissionRate: 0.0,
      includesChat: true,
      includesExams: true,
      includesAssignments: true,
      includesAttendance: true,
      includesPayments: true,
      includesAnalytics: true,
      includesMultiBranch: true,
      isActive: true,
    },
    {
      name: 'VIP',
      description: 'Unlimited plan for teacher networks.',
      type: 'TEACHER' as const,
      billingPeriod: 'MONTHLY' as const,
      priceMonthly: 800,
      currency: 'EGP',
      maxStudents: null,
      commissionRate: 0.0,
      includesChat: true,
      includesExams: true,
      includesAssignments: true,
      includesAttendance: true,
      includesPayments: true,
      includesAnalytics: true,
      includesMultiBranch: true,
      isActive: true,
    },
    // ── STUDENT plans ───────────────────────────────────────────────────
    {
      name: 'Student Basic',
      description: 'Basic student plan with core features.',
      type: 'STUDENT' as const,
      billingPeriod: 'MONTHLY' as const,
      priceMonthly: 30,
      currency: 'EGP',
      commissionRate: 0.0,
      includesChat: true,
      includesExams: true,
      includesAssignments: true,
      includesAttendance: true,
      includesPayments: true,
      includesAnalytics: false,
      includesMultiBranch: false,
      isActive: true,
    },
    {
      name: 'Student Premium',
      description: 'Premium student plan with analytics and priority support.',
      type: 'STUDENT' as const,
      billingPeriod: 'MONTHLY' as const,
      priceMonthly: 75,
      currency: 'EGP',
      commissionRate: 0.0,
      includesChat: true,
      includesExams: true,
      includesAssignments: true,
      includesAttendance: true,
      includesPayments: true,
      includesAnalytics: true,
      includesMultiBranch: false,
      isActive: true,
    },
    // ── PARENT plans ────────────────────────────────────────────────────
    {
      name: 'Parent Basic',
      description: 'Basic parent plan to monitor one child.',
      type: 'PARENT' as const,
      billingPeriod: 'MONTHLY' as const,
      priceMonthly: 20,
      currency: 'EGP',
      commissionRate: 0.0,
      includesChat: true,
      includesExams: true,
      includesAssignments: true,
      includesAttendance: true,
      includesPayments: true,
      includesAnalytics: false,
      includesMultiBranch: false,
      isActive: true,
    },
    {
      name: 'Parent Premium',
      description: 'Premium parent plan with multi-child and analytics.',
      type: 'PARENT' as const,
      billingPeriod: 'MONTHLY' as const,
      priceMonthly: 50,
      currency: 'EGP',
      commissionRate: 0.0,
      includesChat: true,
      includesExams: true,
      includesAssignments: true,
      includesAttendance: true,
      includesPayments: true,
      includesAnalytics: true,
      includesMultiBranch: false,
      isActive: true,
    },
  ];

  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { name: p.name },
      create: p,
      update: {
        description: p.description,
        type: p.type,
        billingPeriod: p.billingPeriod,
        priceMonthly: p.priceMonthly,
        currency: p.currency,
        maxTeachers: p.maxTeachers ?? null,
        maxStudents: p.maxStudents ?? null,
        maxEmployees: p.maxEmployees ?? null,
        maxAssistants: p.maxAssistants ?? null,
        maxRooms: p.maxRooms ?? null,
        commissionRate: p.commissionRate,
        includesChat: p.includesChat,
        includesExams: p.includesExams,
        includesAssignments: p.includesAssignments,
        includesAttendance: p.includesAttendance,
        includesPayments: p.includesPayments,
        includesAnalytics: p.includesAnalytics,
        includesMultiBranch: p.includesMultiBranch,
        isActive: p.isActive,
      },
    });
  }
  console.log(`Subscription plans: ${plans.length}`);
}

async function seedWallets() {
  const existingWallets = await prisma.wallet.count();
  if (existingWallets > 0) return;

  const demoUsers = [
    { username: 'ahmed.student', balance: 5000 },
    { username: 'ahmed.teacher', balance: 0 },
    { username: 'admin', balance: 0 },
  ];

  const centerUser = await prisma.user.findUnique({ where: { username: 'centeradmin' } });
  if (centerUser) {
    demoUsers.push({ username: 'centeradmin', balance: 0 });
  }

  let walletsCreated = 0;
  for (const { username, balance } of demoUsers) {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) continue;

    const wallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        balance: 0,
        status: 'ACTIVE',
        centerId: user.centerId,
      },
    });

    if (balance > 0) {
      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEPOSIT',
          amount: balance,
          balanceBefore: 0,
          balanceAfter: balance,
          description: 'Initial deposit (seed)',
          createdBy: user.id,
        },
      });
      await prisma.wallet.update({ where: { id: wallet.id }, data: { balance } });
    }
    walletsCreated++;
  }
  console.log(`Wallets seeded: ${walletsCreated}`);
}

async function seedNotificationTemplates() {
  const templates = [
    { key: 'CENTER_APPROVED', titleTemplate: 'تمت الموافقة على المركز', bodyTemplate: 'تمت الموافقة على مركزك "{{centerName}}" بنجاح.', type: 'SYSTEM' as const },
    { key: 'CENTER_REJECTED', titleTemplate: 'تم رفض طلب التسجيل', bodyTemplate: 'تم رفض طلب تسجيل مركزك "{{centerName}}". السبب: {{reason}}', type: 'SYSTEM' as const },
    { key: 'PAYMENT_APPROVED', titleTemplate: 'تمت الموافقة على الدفع', bodyTemplate: 'تمت الموافقة على الدفع رقم {{paymentNumber}} بمبلغ {{amount}} {{currency}}.', type: 'SYSTEM' as const },
    { key: 'PAYMENT_REJECTED', titleTemplate: 'تم رفض الدفع', bodyTemplate: 'تم رفض الدفع رقم {{paymentNumber}}. السبب: {{reason}}', type: 'SYSTEM' as const },
    { key: 'LESSON_REMINDER', titleTemplate: 'تذكير بالدرس', bodyTemplate: 'لديك درس "{{subject}}" مع {{teacherName}} في {{date}} الساعة {{time}}.', type: 'LESSON_CHANGE' as const },
    { key: 'ATTENDANCE_ALERT', titleTemplate: 'تنبيه حضور', bodyTemplate: 'الطالب {{studentName}} لم يحضر الدرس "{{subject}}" في {{date}}.', type: 'SYSTEM' as const },
    { key: 'SUBSCRIPTION_EXPIRING', titleTemplate: 'اشتراكك ينتهي قريباً', bodyTemplate: 'اشتراكك في المركز "{{centerName}}" ينتهي في {{endDate}}. يرجى التجديد.', type: 'GENERAL' as const },
    { key: 'SETTLEMENT_READY', titleTemplate: 'تسوية جاهزة', bodyTemplate: 'التسوية رقم {{settlementNumber}} للفترة {{period}} جاهزة للمراجعة والدفع.', type: 'SYSTEM' as const },
  ];

  let count = 0;
  for (const t of templates) {
    const existing = await prisma.notificationTemplate.findUnique({ where: { key: t.key } });
    if (!existing) {
      await prisma.notificationTemplate.create({ data: t });
      count++;
    }
  }
  console.log(`Notification templates seeded: ${count}`);
}

async function main() {
  console.log('Seeding database...');
  await seedSubscriptionPlans();
  await seedPermissions();
  await seedRolePermissions();
  await seedTenant();
  await seedSubjects();
  await seedGrades();
  await seedLocations();
  await seedAdmin();
  await seedTeachers();
  await seedStudentsAndParents();
  await seedLessons();
  await seedRoomsAndGroupLessons();
  await seedAssignments();
  await seedExams();
  await seedRatings();
  // Run last so the demo accounts win over the legacy seed usernames
  // (ahmed.teacher / ahmed.student) and stay bound to the demo center.
  await seedTestAccounts();
  await seedWallets();
  await seedNotificationTemplates();
  console.log('Seeding complete.');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
