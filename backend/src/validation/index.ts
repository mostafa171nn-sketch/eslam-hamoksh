import { z } from 'zod';
import {
  AccountStatus,
  AttendanceStatus,
  ExamQuestionType,
  LessonStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  Role,
} from '@prisma/client';

const username = z
  .string()
  .min(3, 'Username must be at least 3 characters.')
  .max(30, 'Username must be at most 30 characters.')
  .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, dot, dash and underscore.');

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.');

const phone = z
  .string()
  .min(8, 'Phone number must be at least 8 digits.')
  .max(20, 'Phone number is too long.')
  .regex(/^[+0-9()\s-]+$/, 'Invalid phone number format.');

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm 24-hour format.');

const day = z.number().int().min(0).max(6, 'Day must be between 0 (Sunday) and 6 (Saturday).');

const optionalString = z.string().trim().max(5000).optional();

// Email is optional for self-registration (teacher/student/parent). Empty strings
// are normalized to undefined so Prisma stores NULL rather than an empty string.
export const emailOptional = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().email('Enter a valid email (optional).').optional(),
);

const availabilityItem = z.object({
  day,
  startTime: time,
  endTime: time,
  locationId: z.string().uuid().optional(),
});

const subjects = z.array(z.string().min(1)).min(1, 'Select at least one subject.').max(30);
const grades = z.array(z.string().min(1)).min(1, 'Select at least one grade.').max(30);
const subjectIds = z.array(z.string().uuid()).min(1, 'Select at least one subject.').max(30);

export const registerTeacherSchema = z.object({
  centerId: z.string().uuid('Select a center to register with.'),
  fullName: z.string().min(2, 'Full name is required.').max(100),
  username,
  email: emailOptional,
  password,
  confirmPassword: z.string(),
  phone,
  bio: optionalString,
  subjects: z.array(z.string().min(1)).min(1, 'Select at least one subject.').max(30),
  grades: z.array(z.string().min(1)).min(1, 'Select at least one grade.').max(30),
  yearsExperience: z.coerce.number().int().min(0).max(60),
  hourlyRate: z.coerce.number().int().min(0).max(100000),
  locationId: z.string().uuid().optional(),
  availability: z.array(availabilityItem).max(20).optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

export const registerStudentSchema = z.object({
  centerId: z.string().uuid('Select a center to register with.'),
  fullName: z.string().min(2).max(100),
  username,
  email: emailOptional,
  password,
  confirmPassword: z.string(),
  phone,
  gradeId: z.string().uuid('Please select a grade.'),
  subjects: z.array(z.string().min(1)).min(1, 'Select at least one subject.').max(30),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

export const registerParentSchema = z.object({
  centerId: z.string().uuid('Select a center to register with.'),
  fullName: z.string().min(2).max(100),
  username,
  email: emailOptional,
  password,
  confirmPassword: z.string(),
  phone,
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

export const registerCenterSchema = z.object({
  name: z.string().min(2, 'Center name is required.').max(120),
  address: z
    .string()
    .trim()
    .min(1, 'Center address is required.')
    .max(500, 'Address is too long.'),
  city: z
    .string()
    .trim()
    .min(1, 'City is required.')
    .max(120, 'City is too long.'),
  phone,
  email: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().email('Enter a valid email (optional).').optional()),
  website: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().max(200).optional()),
  description: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().max(2000).optional()),
  adminFullName: z.string().min(2, 'Admin full name is required.').max(100),
  adminUsername: username,
  adminEmail: z.string().trim().email('A valid admin email is required.'),
  adminPhone: phone,
  adminPassword: password,
});

export const centerSearchSchema = z.object({
  q: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  subject: z.string().uuid().optional(),
  grade: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

// Public teacher search. `centerId` restricts results to teachers who belong
// to that specific center (used by the center → teachers flow).
export const searchTeachersQuerySchema = z.object({
  name: z.string().max(120).optional(),
  subjectId: z.string().uuid().optional(),
  gradeId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  centerId: z.string().uuid('Invalid center id.').optional(),
  day: z.coerce.number().int().min(0).max(6).optional(),
  time: time.optional(),
  maxPrice: z.coerce.number().int().min(0).max(1000000).optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const centerIdParamSchema = z.object({
  id: z.string().uuid('Invalid center id.'),
});

// Accepts either `username` or `email` so the login form (which posts `email`)
// keeps working; existing username-based clients are unaffected.
export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
});

export const forgotPasswordSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Username or email is required.'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: password,
});

export const updateTeacherProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: phone.optional(),
  bio: optionalString,
  yearsExperience: z.coerce.number().int().min(0).max(60).optional(),
  hourlyRate: z.coerce.number().int().min(0).max(100000).optional(),
  locationId: z.string().uuid().nullable().optional(),
  subjects: subjectIds.optional(),
  grades: z.array(z.string().uuid()).min(1).max(30).optional(),
});

export const updateAvailabilitySchema = z.object({
  availability: z.array(availabilityItem).min(1, 'Add at least one availability entry.').max(20),
});

export const updateStudentProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: phone.optional(),
  gradeId: z.string().uuid().optional(),
  subjects: subjectIds.optional(),
});

export const updateParentProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: phone.optional(),
});

export const createLessonSchema = z.object({
  teacherId: z.string().uuid(),
  studentId: z.string().uuid(),
  subjectId: z.string().uuid().optional(),
  date: z.coerce.date({ message: 'Date is required.' }),
  startTime: time,
  endTime: time,
  locationId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});

// Student-initiated booking. The student id is derived from the authenticated
// user, so it is never taken from the request body. Availability + slot
// uniqueness are enforced server-side in lesson.service.bookLesson.
export const bookLessonSchema = z.object({
  teacherId: z.string().uuid(),
  subjectId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date is required (YYYY-MM-DD).'),
  startTime: time,
  endTime: time.optional(),
  locationId: z.string().uuid().optional(),
});

// Query params for the public available-slots lookup. Both are optional; when
// omitted the service defaults to [today, today+30d].
export const availableSlotsSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD.').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD.').optional(),
});

export const updateLessonSchema = z.object({
  status: z.nativeEnum(LessonStatus).optional(),
  date: z.coerce.date().optional(),
  startTime: time.optional(),
  endTime: time.optional(),
  locationId: z.string().uuid().nullable().optional(),
  subjectId: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const markAttendanceSchema = z.object({
  studentId: z.string().uuid(),
  status: z.nativeEnum(AttendanceStatus),
  note: z.string().max(500).optional(),
});

// --- Attendance QR / scanner ----------------------------------------------

export const generateQrSchema = z.object({
  lessonId: z.string().uuid(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const scanSchema = z.object({
  token: z.string().min(10, 'Invalid QR token.'),
  lessonId: z.string().uuid(),
});

export const updateAttendanceSchema = z.object({
  status: z.nativeEnum(AttendanceStatus),
  note: z.string().max(500).optional(),
});

export const centerSettingsSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  radiusMeters: z.coerce.number().int().min(10).max(100000).optional(),
  attendanceGraceMinutes: z.coerce.number().int().min(0).max(120).optional(),
  timezone: z.string().min(1).max(64).optional(),
  currency: z.string().min(2).max(10).optional(),
});

// --- Payments -------------------------------------------------------------

export const teacherPaymentSettingsSchema = z.object({
  sessionEnabled: z.boolean().optional(),
  monthlyEnabled: z.boolean().optional(),
  sessionPrice: z.coerce.number().int().min(0).max(1000000).optional(),
  monthlyPrice: z.coerce.number().int().min(0).max(10000000).optional(),
  vodafoneCash: z.string().max(60).nullable().optional(),
  etisalatCash: z.string().max(60).nullable().optional(),
  orangeCash: z.string().max(60).nullable().optional(),
  instaPay: z.string().max(60).nullable().optional(),
  telda: z.string().max(60).nullable().optional(),
});

export const createPaymentSchema = z.object({
  teacherId: z.string().uuid(),
  studentId: z.string().uuid(),
  type: z.nativeEnum(PaymentType),
  method: z.nativeEnum(PaymentMethod),
  amount: z.coerce.number().int().min(1).max(10000000).optional(),
  lessonId: z.string().uuid().optional(),
  subscriptionId: z.string().uuid().optional(),
  transactionReference: z.string().max(120).optional(),
});

export const createSubscriptionSchema = z.object({
  teacherId: z.string().uuid(),
  studentId: z.string().uuid(),
  method: z.nativeEnum(PaymentMethod),
  months: z.coerce.number().int().min(1).max(36).optional(),
});

export const correctPaymentSchema = z.object({
  status: z.nativeEnum(PaymentStatus),
  note: z.string().max(500).optional(),
});

export const createAssignmentSchema = z.object({
  title: z.string().min(2, 'Title is required.').max(200),
  description: z.string().max(5000).optional(),
  subjectId: z.string().uuid().optional(),
  deadline: z.coerce.date({ message: 'Deadline is required.' }),
  studentIds: z.array(z.string().uuid()).optional(),
  allStudents: z.boolean().optional(),
});

export const submitAssignmentSchema = z.object({
  textAnswer: z.string().max(20000).optional(),
});

export const gradeSubmissionSchema = z.object({
  grade: z.coerce.number().int().min(0).max(100),
  feedback: z.string().max(2000).optional(),
});

export const questionSchema = z.object({
  type: z.nativeEnum(ExamQuestionType),
  question: z.string().min(2, 'Question text is required.').max(2000),
  options: z.array(z.string().min(1)).min(2).max(6).optional(),
  correctAnswer: z.string().max(500).optional(),
  points: z.coerce.number().int().min(1).max(1000).optional(),
  order: z.number().int().min(0).optional(),
});

export const createExamSchema = z.object({
  name: z.string().min(2, 'Exam name is required.').max(200),
  description: z.string().max(5000).optional(),
  subjectId: z.string().uuid().optional(),
  startTime: z.coerce.date({ message: 'Start time is required.' }),
  endTime: z.coerce.date({ message: 'End time is required.' }),
  durationMinutes: z.coerce.number().int().min(1).max(1440),
  studentIds: z.array(z.string().uuid()).optional(),
  allStudents: z.boolean().optional(),
  questions: z.array(questionSchema).min(1, 'Add at least one question.').max(200),
});

export const saveAnswerSchema = z.object({
  answer: z.string().max(5000).nullable(),
});

export const gradeWrittenSchema = z.object({
  points: z.coerce.number().int().min(0).max(1000),
});

export const rateTeacherSchema = z.object({
  stars: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

// Center ratings share the same shape as teacher ratings.
export const rateCenterSchema = rateTeacherSchema;

export const setUserStatusSchema = z.object({
  status: z.nativeEnum(AccountStatus),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: phone.optional(),
  email: z.string().email().nullable().optional(),
  role: z.nativeEnum(Role).optional(),
  password: password.optional(),
});

export const createAdminSchema = z.object({
  username,
  password,
  fullName: z.string().min(2).max(100),
  phone,
  email: z.string().email().optional(),
});

export const createSubjectSchema = z.object({
  name: z.string().min(2, 'Subject name is required.').max(100),
  icon: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
});

export const updateSubjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  icon: z.string().max(50).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
});

export const createGradeSchema = z.object({
  name: z.string().min(1, 'Grade name is required.').max(100),
  level: z.coerce.number().int().min(1).max(20).optional(),
});

export const updateGradeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  level: z.coerce.number().int().min(1).max(20).optional(),
});

export const createLocationSchema = z.object({
  name: z.string().min(1, 'Location name is required.').max(200),
  address: z.string().max(500).optional(),
});

export const updateLocationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().max(500).nullable().optional(),
});

// --- Employee management ---------------------------------------------------

const employeeRoles = z.enum(['CENTER_EMPLOYEE', 'RECEPTIONIST', 'TEACHER_ASSISTANT']);

export const createEmployeeSchema = z.object({
  fullName: z.string().min(2, 'Full name is required.').max(100),
  username,
  password,
  phone,
  email: emailOptional,
  role: employeeRoles,
});

export const updateEmployeeSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: phone.optional(),
  email: z.string().email().nullable().optional(),
  role: employeeRoles.optional(),
  password: password.optional(),
});

export const setEmployeeStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
});

export const assignRoleSchema = z.object({
  role: employeeRoles,
});

// --- Registration request review -------------------------------------------

export const approveRegistrationRequestSchema = z.object({
  reviewNotes: z.string().max(2000).optional(),
});

export const rejectRegistrationRequestSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required.').max(2000),
  reviewNotes: z.string().max(2000).optional(),
});

// --- Admin center management -----------------------------------------------

export const rejectCenterSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required.').max(2000).optional(),
});

// --- Teacher Assistant management -------------------------------------------

export const assignTeacherAssistantSchema = z.object({
  assistantId: z.string().uuid('Invalid assistant user id.'),
  teacherId: z.string().uuid('Invalid teacher id.'),
});

// --- Subscription Plan management (SUPER_ADMIN) ----------------------------

export const createSubscriptionPlanSchema = z.object({
  name: z.string().min(2, 'Plan name is required.').max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['CENTER', 'TEACHER', 'STUDENT', 'PARENT']),
  billingPeriod: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
  priceMonthly: z.coerce.number().int().min(0).max(10000000),
  currency: z.string().min(2).max(10).optional(),
  maxTeachers: z.coerce.number().int().min(0).max(10000).nullable().optional(),
  maxStudents: z.coerce.number().int().min(0).max(100000).nullable().optional(),
  maxEmployees: z.coerce.number().int().min(0).max(10000).nullable().optional(),
  maxAssistants: z.coerce.number().int().min(0).max(10000).nullable().optional(),
  maxRooms: z.coerce.number().int().min(0).max(1000).nullable().optional(),
  commissionRate: z.coerce.number().min(0).max(1).optional(),
  includesChat: z.boolean().optional(),
  includesExams: z.boolean().optional(),
  includesAssignments: z.boolean().optional(),
  includesAttendance: z.boolean().optional(),
  includesPayments: z.boolean().optional(),
  includesAnalytics: z.boolean().optional(),
  includesMultiBranch: z.boolean().optional(),
});

export const updateSubscriptionPlanSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  priceMonthly: z.coerce.number().int().min(0).max(10000000).optional(),
  maxTeachers: z.coerce.number().int().min(0).max(10000).nullable().optional(),
  maxStudents: z.coerce.number().int().min(0).max(100000).nullable().optional(),
  maxEmployees: z.coerce.number().int().min(0).max(10000).nullable().optional(),
  maxAssistants: z.coerce.number().int().min(0).max(10000).nullable().optional(),
  maxRooms: z.coerce.number().int().min(0).max(1000).nullable().optional(),
  commissionRate: z.coerce.number().min(0).max(1).optional(),
  includesChat: z.boolean().optional(),
  includesExams: z.boolean().optional(),
  includesAssignments: z.boolean().optional(),
  includesAttendance: z.boolean().optional(),
  includesPayments: z.boolean().optional(),
  includesAnalytics: z.boolean().optional(),
  includesMultiBranch: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const assignCenterPlanSchema = z.object({
  centerId: z.string().uuid('Invalid center id.'),
  planId: z.string().uuid('Invalid plan id.'),
});

// --- Center Subscription Management (CENTER_ADMIN, SUPER_ADMIN) ------------

export const cancelCenterSubscriptionSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required.').max(500),
});

export const changeCenterPlanSchema = z.object({
  planId: z.string().uuid('Invalid plan id.'),
  billingPeriod: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
  startDate: z.coerce.date().optional(),
});

export const planIdParamSchema = z.object({
  id: z.string().uuid('Invalid plan id.'),
});

// --- Room Management (CENTER_ADMIN) ----------------------------------------

export const createRoomSchema = z.object({
  name: z.string().min(1, 'Room name is required.').max(100),
  capacity: z.coerce.number().int().min(1).max(10000).nullable().optional(),
  floor: z.string().max(50).nullable().optional(),
  building: z.string().max(100).nullable().optional(),
  locationId: z.string().uuid().nullable().optional(),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'INACTIVE']).optional(),
});

export const updateRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  capacity: z.coerce.number().int().min(1).max(10000).nullable().optional(),
  floor: z.string().max(50).nullable().optional(),
  building: z.string().max(100).nullable().optional(),
  locationId: z.string().uuid().nullable().optional(),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'INACTIVE']).optional(),
});

export const roomIdParamSchema = z.object({
  id: z.string().uuid('Invalid room id.'),
});

// --- Group Lesson / Session (Enrollment) -----------------------------------

export const createGroupLessonSchema = z.object({
  teacherId: z.string().uuid(),
  subjectId: z.string().uuid().optional(),
  date: z.coerce.date({ message: 'Date is required.' }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format.'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format.'),
  roomId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  capacity: z.coerce.number().int().min(2, 'Group lessons must have capacity of at least 2.').max(500),
  notes: z.string().max(2000).optional(),
});

export const enrollStudentSchema = z.object({
  studentId: z.string().uuid('Invalid student id.'),
});

export const lessonIdParamSchema = z.object({
  lessonId: z.string().uuid('Invalid lesson id.'),
});

export const enrollmentIdParamSchema = z.object({
  enrollmentId: z.string().uuid('Invalid enrollment id.'),
});

export const studentIdParamSchema = z.object({
  studentId: z.string().uuid('Invalid student id.'),
});

// --- Wallet Operations ------------------------------------------------------

export const depositWalletSchema = z.object({
  userId: z.string().uuid('Invalid user id.'),
  amount: z.coerce.number().int().min(1).max(100000000),
  description: z.string().max(500).optional(),
  referenceType: z.string().max(50).optional(),
  referenceId: z.string().uuid().optional(),
});

export const withdrawWalletSchema = z.object({
  amount: z.coerce.number().int().min(1).max(100000000),
  description: z.string().max(500).optional(),
  referenceType: z.string().max(50).optional(),
  referenceId: z.string().uuid().optional(),
});

export const adjustWalletSchema = z.object({
  amount: z.coerce.number().int().min(-100000000).max(100000000).refine((v) => v !== 0, 'Amount must be non-zero.'),
  description: z.string().min(3, 'Description is required (min 3 characters).').max(500),
  referenceType: z.string().max(50).optional(),
  referenceId: z.string().uuid().optional(),
});

export const refundWalletSchema = z.object({
  amount: z.coerce.number().int().min(1).max(100000000),
  description: z.string().max(500).optional(),
  referenceType: z.string().max(50).optional(),
  referenceId: z.string().uuid().optional(),
});

// --- Invoice Operations -----------------------------------------------------

export const createInvoiceSchema = z.object({
  paymentId: z.string().uuid().optional(),
  centerId: z.string().uuid().optional(),
  payerId: z.string().uuid().optional(),
  payerName: z.string().max(200).optional(),
  amount: z.coerce.number().int().min(1).max(100000000),
  currency: z.string().min(2).max(10).optional(),
  description: z.string().max(1000).optional(),
  dueAt: z.coerce.date().optional(),
});

// --- Settlement Operations --------------------------------------------------

export const calculateSettlementSchema = z.object({
  centerId: z.string().uuid('Invalid center id.'),
  teacherId: z.string().uuid('Invalid teacher id.'),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format.'),
});

export const calculateBulkSettlementsSchema = z.object({
  centerId: z.string().uuid('Invalid center id.'),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format.'),
});

// --- Report / Analytics Query Schemas -----------------------------------------

export const reportQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, 'from must be YYYY-MM-DD or YYYY-MM.').optional(),
  to: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, 'to must be YYYY-MM-DD or YYYY-MM.').optional(),
  teacherId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  gradeId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  status: z.string().max(30).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

// --- Document Schemas --------------------------------------------------------

export const createDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(['ACADEMIC_CERTIFICATE', 'NATIONAL_ID', 'TRANSCRIPT', 'PHOTO', 'CONTRACT', 'OTHER']).optional(),
  fileUrl: z.string().url().optional(),
  expiresAt: z.coerce.date().optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  type: z.enum(['ACADEMIC_CERTIFICATE', 'NATIONAL_ID', 'TRANSCRIPT', 'PHOTO', 'CONTRACT', 'OTHER']).optional(),
});

// --- Notification Template Schemas -------------------------------------------

export const createNotificationTemplateSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[A-Z_]+$/, 'Key must be uppercase letters and underscores only.'),
  titleTemplate: z.string().min(1, 'Title template is required.').max(500),
  bodyTemplate: z.string().min(1, 'Body template is required.').max(2000),
  type: z.enum(['SYSTEM', 'GENERAL', 'PAYMENT', 'HOMEWORK', 'GRADED', 'ATTENDANCE']).optional(),
  isActive: z.boolean().optional(),
});

export const updateNotificationTemplateSchema = z.object({
  titleTemplate: z.string().min(1).max(500).optional(),
  bodyTemplate: z.string().min(1).max(2000).optional(),
  type: z.enum(['SYSTEM', 'GENERAL', 'PAYMENT', 'HOMEWORK', 'GRADED', 'ATTENDANCE']).optional(),
  isActive: z.boolean().optional(),
});
