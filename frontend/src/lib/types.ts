export type Role = 'SUPER_ADMIN' | 'CENTER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';

/** Center-administrator roles (per-center admin + legacy alias). */
export function isCenterAdminRole(role: Role | undefined): boolean {
  return role === 'CENTER_ADMIN' || role === 'ADMIN';
}
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' | 'INVITED';

export interface Subject {
  id: string;
  name: string;
  icon?: string | null;
  description?: string | null;
}

export interface Grade {
  id: string;
  name: string;
  level?: number | null;
}

export interface Location {
  id: string;
  name: string;
  address?: string | null;
}

export interface Ref {
  id: string;
  name: string;
}

export interface NamePhotoRef {
  id: string;
  fullName: string;
  photo: string | null;
}

// --- Auth / profile -------------------------------------------------------

export interface BaseUser {
  id: string;
  username: string;
  fullName: string;
  phone: string | null;
  photo: string | null;
  email: string | null;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

export interface AvailabilitySlot {
  id: string;
  day: number;
  startTime: string;
  endTime: string;
  location: Ref | null;
}

export interface TeacherInfo {
  id: string;
  bio: string | null;
  yearsExperience: number;
  hourlyRate: number;
  location: Ref | null;
  subjects: Subject[];
  grades: Grade[];
  availability: AvailabilitySlot[];
}

export interface StudentInfo {
  id: string;
  studentNumber?: string | null;
  grade: Ref | null;
  subjects: Subject[];
  teachers: NamePhotoRef[];
  parents: { id: string; fullName: string }[];
}

export interface ChildInfo {
  id: string;
  userId: string;
  fullName: string;
  photo: string | null;
  grade: string | null;
  studentNumber?: string | null;
}

export interface ParentInfo {
  id: string;
  children: ChildInfo[];
}

export type User = BaseUser &
  (
    | { role: 'SUPER_ADMIN'; superAdmin?: boolean }
    | { role: 'CENTER_ADMIN'; admin: { id: string } }
    | { role: 'ADMIN'; admin: { id: string } }
    | { role: 'TEACHER'; teacher: TeacherInfo }
    | { role: 'STUDENT'; student: StudentInfo }
    | { role: 'PARENT'; parent: ParentInfo }
  );

// --- Lessons --------------------------------------------------------------

export type LessonStatus = 'SCHEDULED' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface Lesson {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: LessonStatus;
  notes: string | null;
  subject: Subject | null;
  location: Location | null;
  teacher: NamePhotoRef;
  student: NamePhotoRef;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
export type AttendanceMethod = 'QR' | 'MANUAL' | 'SYSTEM';

export interface AttendanceRecord {
  id: string;
  status: AttendanceStatus;
  method?: AttendanceMethod;
  note: string | null;
  markedAt?: string;
  createdAt: string;
  lesson: { date: string; startTime: string; endTime: string; subject: Subject | null };
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  percentage: number;
}

export interface AttendanceQrResponse {
  token: string;
  expiresAt: string;
  ttlSeconds: number;
  lesson: { id: string; subject: string; teacher: string; startTime: string; endTime: string };
}

export interface ScanStudent {
  id: string;
  fullName: string;
  username: string;
  photo: string | null;
}

export interface ScanResult {
  alreadyMarked: boolean;
  student: ScanStudent;
  attendance: { status: AttendanceStatus; markedAt: string; method: AttendanceMethod };
}

export interface LessonAttendanceRow {
  student: { id: string; fullName: string; photo: string | null };
  status: AttendanceStatus | null;
  method: AttendanceMethod | null;
  markedAt: string | null;
}

export interface LessonAttendanceLive {
  lesson: { id: string; subject: string; teacher: string; startTime: string; endTime: string; date: string; status: string };
  enrolledCount: number;
  present: number;
  late: number;
  absent: number;
  notMarked: number;
  rows: LessonAttendanceRow[];
}

export interface AttendanceAdminRow {
  id: string;
  status: AttendanceStatus;
  method: AttendanceMethod;
  markedAt: string;
  note: string | null;
  student: { id: string; fullName: string; photo: string | null };
  lesson: { id: string; subject: string; teacher: string; date: string; startTime: string; endTime: string };
}

export interface CenterSettings {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  attendanceGraceMinutes: number;
  timezone: string;
  currency: string;
}

export interface AttendanceAdminSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
  lowAttendance: { studentId: string; fullName: string; percentage: number; total: number }[];
}

export interface ParentChildAttendance {
  student: { id: string; fullName: string; photo: string | null };
  summary: AttendanceSummary;
  recent: { id: string; status: AttendanceStatus; markedAt: string | null; subject: string; date: string; startTime: string }[];
}

// --- Assignments ----------------------------------------------------------

export type SubmissionStatus =
  | 'SUBMITTED'
  | 'LATE'
  | 'GRADED'
  | 'NOT_SUBMITTED';

export interface AssignmentSummary {
  id: string;
  title: string;
  description: string | null;
  attachment: string | null;
  deadline: string;
  createdAt: string;
  subject: Subject | null;
  teacher: NamePhotoRef | null;
  studentCount: number;
  submittedCount: number;
}

export interface StudentAssignment {
  id: string;
  title: string;
  description: string | null;
  attachment: string | null;
  deadline: string;
  createdAt: string;
  subject: Subject | null;
  teacher: NamePhotoRef;
  status: SubmissionStatus;
  submission: {
    id: string;
    file: string | null;
    textAnswer: string | null;
    submittedAt: string;
    grade: number | null;
    feedback: string | null;
  } | null;
}

export interface SubmissionRow {
  student: NamePhotoRef;
  status: SubmissionStatus;
  submission: {
    id: string;
    file: string | null;
    textAnswer: string | null;
    submittedAt: string;
    grade: number | null;
    feedback: string | null;
  } | null;
}

// --- Exams ----------------------------------------------------------------

export type ExamQuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'WRITTEN';
export type AttemptStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_SUBMITTED';

export interface ExamQuestion {
  id: string;
  type: ExamQuestionType;
  question: string;
  options?: string[];
  points: number;
  order: number;
  correctAnswer?: string;
}

export interface MyAttempt {
  status: AttemptStatus;
  score: number | null;
  percentage: number | null;
  maxScore: number | null;
  startedAt: string | null;
  submittedAt: string | null;
}

export interface Exam {
  id: string;
  name: string;
  description: string | null;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  createdAt: string;
  subject: Subject | null;
  teacher: { id: string; fullName: string } | null;
  students: { studentId: string; fullName: string }[];
  questions: ExamQuestion[];
  isUpcoming: boolean;
  isActive: boolean;
  isEnded: boolean;
  myAttempt?: MyAttempt;
}

export interface AttemptResult {
  id: string;
  status: AttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  score: number;
  maxScore: number;
  percentage: number | null;
  correctCount: number | null;
  totalCount: number | null;
  exam: {
    id: string;
    name: string;
    subject: Subject | null;
    teacher: string | null;
  };
  isOwner: boolean;
  questions: {
    id: string;
    type: ExamQuestionType;
    question: string;
    options?: string[];
    points: number;
    yourAnswer: string | null;
    isCorrect: boolean | null;
    correctAnswer?: string;
    pointsEarned: number;
    graded: boolean;
  }[];
}

export interface ExamResults {
  exam: { id: string; name: string };
  summary: {
    totalStudents: number;
    submitted: number;
    absent: number;
    average: number;
    highest: number;
    lowest: number;
    passRate: number;
  };
  results: {
    student: NamePhotoRef;
    status: AttemptStatus;
    score: number | null;
    maxScore: number;
    percentage: number | null;
    submittedAt: string | null;
    writtenPending: boolean;
  }[];
}

// --- Teachers -------------------------------------------------------------

export interface PublicTeacher {
  id: string;
  fullName: string;
  bio: string | null;
  yearsExperience: number;
  hourlyRate: number;
  photo: string | null;
  createdAt: string;
  location: Ref | null;
  subjects: Subject[];
  grades: Grade[];
  availability: AvailabilitySlot[];
  rating: number;
  ratingCount: number;
}

export interface TeacherProfile extends PublicTeacher {
  studentCount: number;
  completedLessons: number;
  isEnrolled?: boolean;
  myLessonsCount?: number;
  reviews: Review[];
  reviewsTotal: number;
}

export interface Review {
  id: string;
  stars: number;
  comment: string | null;
  createdAt: string;
  author: { type: 'student' | 'parent'; fullName: string; photo: string | null };
}

export interface TeacherStats {
  totalStudents: number;
  upcomingLessons: number;
  todayLessons: number;
  pendingAssignments: number;
  upcomingExams: number;
  averageRating: number;
  completedLessons: number;
  upcomingLessonsList: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    subject: Subject | null;
    student: { id: string; fullName: string };
  }[];
}

export interface AvailableSlot {
  date: string;
  day: number;
  startTime: string;
  endTime: string;
  locationId: string | null;
  location: Ref | null;
  booked: boolean;
  bookedByMe: boolean;
}

export interface BookLessonInput {
  teacherId: string;
  subjectId?: string;
  date: string;
  startTime: string;
  endTime?: string;
  locationId?: string;
  centerId?: string;
}

export interface MyTeacher {
  id: string;
  fullName: string;
  photo: string | null;
  isEnrolled?: boolean;
  subjects: Subject[];
  upcomingLesson: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    subject: Subject | null;
  } | null;
}

export interface TeacherStudent {
  id: string;
  userId: string;
  fullName: string;
  photo: string | null;
  grade: Ref | null;
  subjects: Subject[];
  upcomingLesson: { id: string; date: string; startTime: string; endTime: string } | null;
  attendance: { studentId: string; status: AttendanceStatus; _count: { _all: number } }[];
}

// --- Notifications --------------------------------------------------------

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// --- Admin ----------------------------------------------------------------

export interface AdminStats {
  totalTeachers: number;
  totalStudents: number;
  totalParents: number;
  totalLessons: number;
  activeLessons: number;
  completedLessons: number;
  upcomingLessons: number;
  totalExams: number;
  totalAssignments: number;
  averageTeacherRating: number;
  newUsersThisMonth: number;
  todayLessons: number;
}

export interface AdminUser {
  id: string;
  username: string;
  fullName: string;
  phone: string | null;
  photo: string | null;
  email: string | null;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

export interface AdminTeacher {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  phone: string | null;
  photo: string | null;
  status: UserStatus;
  location: Location | null;
  subjects: string[];
  grades: string[];
  hourlyRate: number;
  yearsExperience: number;
  students: number;
  lessons: number;
}

export interface ActivityLog {
  id: string;
  user: { fullName: string; username: string } | null;
  role: Role | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
}

export interface AnalyticsData {
  studentsPerGrade: { grade: string; count: number }[];
  studentGrowth: { month: string; count: number }[];
  totalStudents: number;
  activeStudents: number;
  teachersPerSubject: { subject: string; count: number }[];
  studentsPerTeacher: { teacher: string; count: number }[];
  teacherRatings: { teacher: string; average: number; count: number }[];
  lessonsPerMonth: { month: string; count: number }[];
  busyDays: { day: number; count: number }[];
  busyHours: { hour: number; count: number }[];
  cancelledLessons: number;
  completedLessons: number;
  subjectPopularity: { subject: string; count: number }[];
  exams: {
    total: number;
    attempts: number;
    average: number;
    highest: number;
    lowest: number;
    passRate: number;
  };
  assignments: {
    total: number;
    submitted: number;
    late: number;
    averageGrade: number;
  };
}

// --- Student dashboard ----------------------------------------------------

export interface StudentDashboard {
  todayLessons: Lesson[];
  upcomingLessons: Lesson[];
  upcomingExams: { id: string; name: string; startTime: string; endTime: string; subject: Subject | null }[];
  pendingAssignments: { id: string; title: string; deadline: string; subject: Subject | null; submitted: boolean }[];
  recentResults: {
    id: string;
    status: AttemptStatus;
    score: number | null;
    percentage: number | null;
    submittedAt: string;
    exam: { name: string; subject: Subject | null };
  }[];
  unreadNotifications: number;
  attendance: {
    id: string;
    status: AttendanceStatus;
    createdAt: string;
    lesson: { date: string; subject: Subject | null };
  }[];
}

// --- Payments & subscriptions --------------------------------------------

export type PaymentType = 'SESSION' | 'MONTHLY';
export type PaymentMethodType =
  | 'VODAFONE_CASH'
  | 'ETISALAT_CASH'
  | 'ORANGE_CASH'
  | 'INSTAPAY'
  | 'TELDA';
export type PaymentStatusType = 'PENDING' | 'PAID' | 'REJECTED' | 'EXPIRED' | 'REFUNDED';
export type SubscriptionStatusType = 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'CANCELLED';

export interface PaymentHistoryEntry {
  id: string;
  oldStatus: PaymentStatusType | null;
  newStatus: PaymentStatusType;
  changedByName: string | null;
  reason: string | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  payerName: string;
  student: { id: string; fullName: string; photo: string | null } | null;
  teacher: { id: string; fullName: string } | null;
  parent: { id: string; fullName: string } | null;
  amount: number;
  currency: string;
  type: PaymentType;
  method: PaymentMethodType;
  methodLabel: string;
  status: PaymentStatusType;
  transactionReference: string | null;
  proofUrl: string | null;
  rejectionReason: string | null;
  paidAt: string | null;
  createdAt: string;
  lesson: { id: string; subject: string } | null;
  subscription: { id: string; status: SubscriptionStatusType } | null;
  history: PaymentHistoryEntry[];
}

export interface PaymentSummary {
  totalPayments: number;
  paidCount: number;
  pendingCount: number;
  rejectedCount: number;
  refundedCount: number;
  totalRevenue: number;
  sessionRevenue: number;
  monthlyRevenue: number;
  currency: string;
  methodStats: { method: PaymentMethodType; methodLabel: string; count: number; revenue: number }[];
}

export interface TeacherPaymentSettings {
  id: string;
  sessionEnabled: boolean;
  monthlyEnabled: boolean;
  sessionPrice: number;
  monthlyPrice: number;
  vodafoneCash: string | null;
  etisalatCash: string | null;
  orangeCash: string | null;
  instaPay: string | null;
  telda: string | null;
}

export interface Subscription {
  id: string;
  student: { id: string; fullName: string; photo: string | null };
  teacher: { id: string; fullName: string };
  parent: { id: string; fullName: string } | null;
  monthlyPrice: number;
  paymentMethod: PaymentMethodType | null;
  startDate: string;
  endDate: string;
  status: SubscriptionStatusType;
  createdAt: string;
  payments: { id: string; status: PaymentStatusType; amount: number }[];
}
