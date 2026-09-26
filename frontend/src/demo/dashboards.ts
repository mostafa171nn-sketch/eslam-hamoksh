import type {
  ActivityLog,
  AdminStats,
  AdminTeacher,
  AdminUser,
  AnalyticsData,
  AttendanceRecord,
  AttendanceSummary,
  AvailableSlot,
  Lesson,
  MyTeacher,
  Notification,
  ParentChildAttendance,
  Payment,
  PaymentSummary,
  StudentAssignment,
  StudentDashboard,
  TeacherPaymentSettings,
  TeacherStats,
} from '../lib/types';
import { SUBJECTS, GRADES, CENTERS, centerById } from './catalog';
import { ok, fail, daysFromNow, atTime, paginate, matchesSearch } from './helpers';

const subj = (id: string) => SUBJECTS.find((s) => s.id === id) ?? null;
const gr = (id: string) => GRADES.find((g) => g.id === id) ?? null;

/* ------------------------------------------------------------------ */
/*  Lessons                                                            */
/* ------------------------------------------------------------------ */

export interface LessonSource {
  teacherId: string;
  teacherName: string;
  subjectId: string;
  gradeId: string;
  day: number; // JS getDay() 0=Sunday..6=Saturday
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  locationId: string;
  status: 'SCHEDULED' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
}

const fallbackLocation = { id: 'loc-zamalek', name: 'الزمالك', address: 'ش جمال الدين أبو المحاسن' };

export function mkLesson(
  id: string,
  offsetDays: number,
  source: Partial<LessonSource>,
  student: { id: string; fullName: string } | undefined,
  overrides?: Partial<Lesson>,
): Lesson {
  const subjectObj = source.subjectId ? subj(source.subjectId) : null;
  return {
    id,
    date: daysFromNow(offsetDays),
    startTime: source.startTime ?? '16:00',
    endTime: source.endTime ?? '17:30',
    status: (source.status ?? 'SCHEDULED') as Lesson['status'],
    notes: null,
    subject: subjectObj,
    location: subjectObj ? { id: fallbackLocation.id, name: fallbackLocation.name, address: fallbackLocation.address } : null,
    teacher: { id: source.teacherId ?? 't-01', fullName: source.teacherName ?? 'د. أحمد عبد الرحمن', photo: null },
    student: student ? { ...student, photo: null } : { id: 'stu-1', fullName: 'عمر محمد', photo: null },
    ...overrides,
  };
}

/** Lessons for the demo student (stu-1) and their teachers. */
export function studentLessons(): Lesson[] {
  const student = { id: 'stu-1', fullName: 'عمر محمد' };
  return [
    mkLesson('l-001', 0, { teacherId: 't-01', teacherName: 'د. أحمد عبد الرحمن', subjectId: 'sub-math', startTime: '16:00', endTime: '17:30' }, student),
    mkLesson('l-002', 0, { teacherId: 't-07', teacherName: 'أ. كريم عاصم', subjectId: 'sub-arabic', startTime: '18:00', endTime: '19:30' }, student),
    mkLesson('l-003', 0, { teacherId: 't-05', teacherName: 'د. حسام الدين إبراهيم', subjectId: 'sub-chem', startTime: '14:30', endTime: '16:00' }, student),
    mkLesson('l-101', 1, { teacherId: 't-01', teacherName: 'د. أحمد عبد الرحمن', subjectId: 'sub-math', startTime: '17:00', endTime: '18:30' }, student),
    mkLesson('l-102', 2, { teacherId: 't-05', teacherName: 'د. حسام الدين إبراهيم', subjectId: 'sub-chem', startTime: '16:00', endTime: '17:30' }, student),
    mkLesson('l-103', 3, { teacherId: 't-01', teacherName: 'د. أحمد عبد الرحمن', subjectId: 'sub-math', startTime: '18:00', endTime: '19:30' }, student),
    mkLesson('l-104', 4, { teacherId: 't-07', teacherName: 'أ. كريم عاصم', subjectId: 'sub-arabic', startTime: '15:30', endTime: '17:00' }, student),
    mkLesson('l-105', 6, { teacherId: 't-01', teacherName: 'د. أحمد عبد الرحمن', subjectId: 'sub-math', startTime: '16:30', endTime: '18:00' }, student),
    {
      ...mkLesson('l-201', -1, { teacherId: 't-01', teacherName: 'د. أحمد عبد الرحمن', subjectId: 'sub-math', startTime: '17:00', endTime: '18:30', status: 'COMPLETED' }, student),
      notes: 'مراجعة على حل المعادلات من الدرجة الثانية.',
    },
    {
      ...mkLesson('l-202', -2, { teacherId: 't-07', teacherName: 'أ. كريم عاصم', subjectId: 'sub-arabic', startTime: '15:00', endTime: '16:30', status: 'COMPLETED' }, student),
      notes: 'تدريبات على باب البلاغة.',
    },
    {
      ...mkLesson('l-203', -3, { teacherId: 't-05', teacherName: 'د. حسام الدين إبراهيم', subjectId: 'sub-chem', startTime: '14:00', endTime: '15:30', status: 'COMPLETED' }, student),
      notes: null,
    },
    { ...mkLesson('l-204', -4, { teacherId: 't-01', teacherName: 'د. أحمد عبد الرحمن', subjectId: 'sub-math', startTime: '16:00', endTime: '17:30', status: 'COMPLETED' }, student), notes: 'حل أسئلة كتاب المدرسة.' },
  ];
}

export function lessonsForStudent(params: { date?: string; status?: string; page?: number; limit?: number }) {
  let list = studentLessons();
  if (params.date) list = list.filter((l) => l.date === params.date);
  if (params.status) list = list.filter((l) => l.status === params.status?.toUpperCase());
  const { items, meta } = paginate(list, params.page ?? 1, params.limit ?? 20);
  return ok(items, meta);
}

/* ------------------------------------------------------------------ */
/*  Student dashboard (also powers the parent's ChildDashboard)        */
/* ------------------------------------------------------------------ */

const EXAMS_POOL = [
  { id: 'ex-01', name: 'اختبار الجبر — الوحدة الأولى', subjectId: 'sub-math', daysAhead: 2 },
  { id: 'ex-02', name: 'اختبار اللغة العربية — النحو', subjectId: 'sub-arabic', daysAhead: 5 },
  { id: 'ex-03', name: 'اختبار الكيمياء — التفاعلات', subjectId: 'sub-chem', daysAhead: 8 },
];
const ASSIGN_POOL = [
  { id: 'as-01', title: 'واجب الرياضيات: حل تمارين 4-2', subjectId: 'sub-math', daysAhead: 1 },
  { id: 'as-02', title: 'مقال قصير عن دور النيل', subjectId: 'sub-arabic', daysAhead: 2 },
  { id: 'as-03', title: 'تقرير تجربة التفاعل الكيميائي', subjectId: 'sub-chem', daysAhead: 4 },
  { id: 'as-04', title: 'تمارين التفاضل صفحة 85', subjectId: 'sub-math', daysAhead: 6, submitted: true },
];

function dashboardAttendance() {
  const statuses = ['PRESENT', 'PRESENT', 'PRESENT', 'ABSENT', 'PRESENT', 'LATE', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT'] as const;
  return statuses.map((status, i) => ({
    id: `att-${10 - i}`,
    status,
    createdAt: atTime(-i, '20:15'),
    lesson: {
      date: daysFromNow(-i),
      subject: i % 2 === 0 ? subj('sub-math') : i % 3 === 0 ? subj('sub-arabic') : subj('sub-chem'),
    },
  }));
}

export function studentDashboardChild(studentId: string): StudentDashboard {
  void studentId;
  const lessons = studentLessons();
  const today = lessons.filter((l) => l.date === daysFromNow(0));
  const upcoming = lessons.filter((l) => l.date > daysFromNow(0));
  return {
    todayLessons: today,
    upcomingLessons: upcoming,
    upcomingExams: EXAMS_POOL.map((e) => ({
      id: e.id,
      name: e.name,
      startTime: atTime(e.daysAhead, '18:00'),
      endTime: atTime(e.daysAhead, '19:30'),
      subject: subj(e.subjectId),
    })),
    pendingAssignments: ASSIGN_POOL.filter((a) => a.daysAhead >= 0).map((a) => ({
      id: a.id,
      title: a.title,
      deadline: atTime(a.daysAhead, '23:59'),
      subject: subj(a.subjectId),
      submitted: Boolean((a as { submitted?: boolean }).submitted),
    })),
    recentResults: [
      { id: 'r-01', status: 'SUBMITTED', score: 22, percentage: 88, submittedAt: atTime(-1, '19:40'), exam: { name: 'اختبار الجبر الشهري', subject: subj('sub-math') } as { name: string; subject: { id: string; name: string } | null } },
      { id: 'r-02', status: 'SUBMITTED', score: 18, percentage: 72, submittedAt: atTime(-3, '20:10'), exam: { name: 'اختبار النحو الثاني', subject: subj('sub-arabic') } as never },
      { id: 'r-03', status: 'SUBMITTED', score: 95, percentage: 95, submittedAt: atTime(-7, '17:45'), exam: { name: 'اختبار الكيمياء القصير', subject: subj('sub-chem') } as never },
      { id: 'r-04', status: 'SUBMITTED', score: 18, percentage: 90, submittedAt: atTime(-10, '18:30'), exam: { name: 'اختبار جبر — تغذية راجعة', subject: subj('sub-math') } as never },
    ].map((r) => ({
      id: r.id,
      status: r.status as 'SUBMITTED',
      score: r.score,
      percentage: r.percentage,
      submittedAt: r.submittedAt,
      exam: { name: r.exam.name, subject: r.exam.subject as { id: string; name: string } | null },
    })),
    unreadNotifications: 5,
    attendance: dashboardAttendance(),
  };
}

/* ------------------------------------------------------------------ */
/*  Teacher dashboard (demo.teacher.1 → t-01)                          */
/* ------------------------------------------------------------------ */

export function teacherStats(): TeacherStats {
  const students = teacherStudents();
  const list: TeacherStats['upcomingLessonsList'] = [
    { id: 'tl-01', date: daysFromNow(0), startTime: '16:00', endTime: '17:30', status: 'SCHEDULED', subject: subj('sub-math'), student: { id: 'stu-1', fullName: 'عمر محمد' } },
    { id: 'tl-02', date: daysFromNow(0), startTime: '18:00', endTime: '19:00', status: 'SCHEDULED', subject: subj('sub-math'), student: { id: 'stu-9', fullName: 'عبدالله خالد' } },
    { id: 'tl-03', date: daysFromNow(0), startTime: '19:15', endTime: '20:15', status: 'SCHEDULED', subject: subj('sub-math'), student: { id: 'stu-6', fullName: 'مريم الطحاوي' } },
    { id: 'tl-04', date: daysFromNow(1), startTime: '17:00', endTime: '18:30', status: 'SCHEDULED', subject: subj('sub-math'), student: { id: 'stu-1', fullName: 'عمر محمد' } },
    { id: 'tl-05', date: daysFromNow(2), startTime: '18:30', endTime: '20:00', status: 'SCHEDULED', subject: subj('sub-math'), student: { id: 'stu-4', fullName: 'سلمى حسن' } },
    { id: 'tl-06', date: daysFromNow(3), startTime: '16:00', endTime: '17:30', status: 'SCHEDULED', subject: subj('sub-math'), student: { id: 'stu-8', fullName: 'يوسف وليد' } },
  ];
  return {
    totalStudents: students.length,
    upcomingLessons: 8,
    todayLessons: 3,
    pendingAssignments: 4,
    upcomingExams: 2,
    averageRating: 4.9,
    completedLessons: 220,
    upcomingLessonsList: list,
  };
}

const STUDENT_POOL = [
  ['stu-1', 'عمر محمد', 'g1s'],
  ['stu-2', 'نور محمد', 'g3pr'],
  ['stu-3', 'سلمى حسن', 'g2s'],
  ['stu-4', 'عبدالله خالد', 'g1s'],
  ['stu-5', 'مريم الطحاوي', 'g1s'],
  ['stu-6', 'يوسف وليد', 'g2s'],
  ['stu-7', 'أميرة صلاح', 'g1s'],
  ['stu-8', 'مصطفى كامل', 'g1s'],
  ['stu-9', 'رنا فتحي', 'g2s'],
  ['stu-10', 'كريم رمضان', 'g1s'],
  ['stu-11', 'سما عيد', 'g3pr'],
  ['stu-12', 'آدم فرج', 'g1s'],
] as const;

export function teacherStudents() {
  return STUDENT_POOL.map(([id, fullName, gradeId], i) => ({
    id: String(id),
    userId: `u-${id}`,
    fullName: String(fullName),
    photo: null,
    grade: gr(String(gradeId)),
    subjects: [subj('sub-math')].filter((s): s is NonNullable<typeof s> => s !== null),
    upcomingLesson:
      i % 2 === 0
        ? { id: `tsl-${i}`, date: daysFromNow(i % 4), startTime: '16:00', endTime: '17:30' }
        : null,
    attendance: [{ studentId: String(id), status: 'PRESENT', _count: { _all: 18 } }],
  }));
}

/* ------------------------------------------------------------------ */
/*  My teachers / follows (student)                                    */
/* ------------------------------------------------------------------ */

export function myTeachers(): MyTeacher[] {
  const teachers = [
    { id: 't-01', fullName: 'د. أحمد عبد الرحمن', subjectId: 'sub-math' },
    { id: 't-05', fullName: 'د. حسام الدين إبراهيم', subjectId: 'sub-chem' },
    { id: 't-07', fullName: 'أ. كريم عاصم', subjectId: 'sub-arabic' },
  ];
  return teachers.map((t, i) => {
    const subject = subj(t.subjectId);
    return {
      id: t.id,
      fullName: t.fullName,
      photo: null,
      isEnrolled: true,
      subjects: subject ? [subject] : [],
      upcomingLesson: i === 0 ? { id: `mtl-${i}`, date: daysFromNow(1), startTime: '17:00', endTime: '18:30', status: 'SCHEDULED', subject } : null,
    };
  });
}

/** Centers the demo student follows. */
export function studentFollowedCenters() {
  return CENTERS.filter((c) => ['c-nile', 'c-future', 'c-roada'].includes(c.id));
}

export function checkFollow(centerId: string) {
  return ok({ isFollowing: studentFollowedCenters().some((c) => c.id === centerId) });
}

/* ------------------------------------------------------------------ */
/*  Parent area                                                        */
/* ------------------------------------------------------------------ */

const CHILDREN = [
  { id: 'stu-1', userId: 'u-stu1', fullName: 'عمر محمد', photo: null, grade: 'Grade 1 Secondary', gradeRef: gr('g1s'), subjects: ['sub-math', 'sub-arabic', 'sub-physics'] },
  { id: 'stu-2', userId: 'u-stu2', fullName: 'نور محمد', photo: null, grade: 'Grade 3 Preparatory', gradeRef: gr('g3pr'), subjects: ['sub-english', 'sub-science'] },
];

export function parentsChildren() {
  return ok(
    CHILDREN.map((c) => ({
      id: c.id,
      userId: c.userId,
      fullName: c.fullName,
      photo: c.photo,
      grade: c.gradeRef ? { id: c.gradeRef.id, name: c.gradeRef.name } : null,
      subjects: c.subjects.map((s) => subj(s)).filter((s): s is NonNullable<typeof s> => s !== null),
    })),
  );
}

export function parentsDashboard() {
  return ok({
    children: CHILDREN.map((c) => ({ id: c.id, userId: c.userId, fullName: c.fullName, photo: c.photo, grade: c.grade })),
    unreadNotifications: 3,
  });
}

export function childDashboard(studentId: string) {
  if (!CHILDREN.some((c) => c.id === studentId)) return { status: 404, response: fail('الطالب غير موجود.') };
  return { status: 200, response: ok(studentDashboardChild(studentId)) };
}

export function parentsChildrenPost(body: unknown) {
  const { childUsername } = (body ?? {}) as { childUsername?: string };
  void childUsername;
  return { status: 200, response: ok({}) };
}

/* ------------------------------------------------------------------ */
/*  Attendance                                                         */
/* ------------------------------------------------------------------ */

export function attendanceSummary(studentId: string): { status: number; response: unknown } {
  void studentId;
  return {
    status: 200,
    response: ok<AttendanceSummary>({
      present: 14,
      absent: 2,
      late: 3,
      excused: 1,
      total: 20,
      percentage: 85,
    }),
  };
}

function attendanceRecords(): AttendanceRecord[] {
  const statuses = ['PRESENT', 'PRESENT', 'LATE', 'PRESENT', 'ABSENT', 'PRESENT', 'PRESENT', 'EXCUSED'] as const;
  const subjects = ['sub-math', 'sub-arabic', 'sub-chem', 'sub-physics'] as const;
  return statuses.map((status, i) => ({
    id: `sa-${i}`,
    status,
    method: 'QR',
    note: null,
    markedAt: atTime(-i, '17:35'),
    createdAt: atTime(-i, '17:36'),
    lesson: {
      date: daysFromNow(-i),
      startTime: '16:00',
      endTime: '17:30',
      subject: subj(subjects[i % subjects.length]),
    },
  }));
}

export function studentAttendanceRecords(studentId: string, page: number, limit: number) {
  void studentId;
  const { items, meta } = paginate(attendanceRecords(), page, limit);
  return ok(items, meta);
}

export function parentAttendanceOverview(): ParentChildAttendance[] {
  return CHILDREN.map((c, idx) => {
    const recs = attendanceRecords();
    return {
      student: { id: c.id, fullName: c.fullName, photo: c.photo },
      summary: { present: 14, absent: 2, late: 3, excused: 1, total: 20, percentage: idx === 0 ? 85 : 90 },
      recent: recs.slice(0, 5).map((r) => ({
        id: r.id,
        status: r.status,
        markedAt: r.markedAt ?? null,
        subject: r.lesson.subject?.name ?? '—',
        date: r.lesson.date,
        startTime: r.lesson.startTime,
      })),
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Exams & assignments (student/teacher area)                         */
/* ------------------------------------------------------------------ */

export function examsForStudent(studentId: string, page: number, limit: number, status?: string) {
  void studentId;
  const base = EXAMS_POOL.map((e, i) => ({
    id: e.id,
    name: e.name,
    description: i === 0 ? 'اختبر نفسك في الوحدة الأولى — جبر.' : i === 1 ? 'تقييم شامل في النحو والبلاغة.' : 'تفاعلات وتفاعلات كيميائية.',
    startTime: atTime(e.daysAhead, '18:00'),
    endTime: atTime(e.daysAhead, '19:15'),
    durationMinutes: 75,
    createdAt: atTime(-14, '12:00'),
    subject: subj(e.subjectId),
    teacher: i % 2 === 0 ? { id: 't-01', fullName: 'د. أحمد عبد الرحمن' } : { id: 't-05', fullName: 'د. حسام الدين إبراهيم' },
    students: [{ studentId: 'stu-1', fullName: 'عمر محمد' }],
    questions: [],
    isUpcoming: true,
    isActive: false,
    isEnded: false,
    myAttempt: { status: 'NOT_STARTED', score: null, percentage: null, maxScore: null, startedAt: null, submittedAt: null },
  }));
  const filtered = status ? base.filter((e) => (status === 'upcoming' ? e.isUpcoming : status === 'active' ? e.isActive : e.isEnded)) : base;
  const { items, meta } = paginate(filtered, page, limit);
  return ok(items, meta);
}

export function assignmentsForStudent(studentId: string, page: number, limit: number) {
  void studentId;
  const list: StudentAssignment[] = ASSIGN_POOL.map((a, i) => ({
    id: a.id,
    title: a.title,
    description: i % 2 === 0 ? 'أجب عن جميع الأسئلة وارفع إجابتك قبل الموعد النهائي.' : null,
    attachment: null,
    deadline: atTime(a.daysAhead, '23:59'),
    createdAt: atTime(-5, '14:00'),
    subject: subj(a.subjectId),
    teacher: { id: 't-01', fullName: 'د. أحمد عبد الرحمن', photo: null },
    status: a.daysAhead <= 0 ? 'GRADED' : 'NOT_SUBMITTED',
    submission:
      a.daysAhead <= 0
        ? { id: `sub-${a.id}`, file: null, textAnswer: 'جاري المراجعة.', submittedAt: atTime(-1, '22:10'), grade: null, feedback: null }
        : null,
  }));
  const { items, meta } = paginate(list, page, limit);
  return ok(items, meta);
}

export function teacherAssignments(page: number, limit: number) {
  const list = ASSIGN_POOL.map((a) => ({
    id: a.id,
    title: a.title,
    description: 'إجباري لجميع الطلاب.',
    attachment: null,
    deadline: atTime(a.daysAhead, '23:59'),
    createdAt: atTime(-5, '14:00'),
    subject: subj(a.subjectId),
    teacher: { id: 't-01', fullName: 'د. أحمد عبد الرحمن', photo: null },
    studentCount: 12,
    submittedCount: 9,
  }));
  const { items, meta } = paginate(list, page, limit);
  return ok(items, meta);
}

/* ------------------------------------------------------------------ */
/*  Notifications                                                      */
/* ------------------------------------------------------------------ */

const NOTIF_TEMPLATES: [string, string][] = [
  ['حصة قادمة', 'غدًا حصة رياضيات الساعة ٤:٠٠ مساءً مع د. أحمد عبد الرحمن.'],
  ['واجب جديد', 'تم نشر واجب رياضيات جديد — حل تمارين ٤-٢ قبل يوم الجمعة.'],
  ['نتيجة اختبار', 'تم تصحيح اختبار الجبر — نتيجتك ٨٨٪. أحسنت!'],
  ['تذكير بدفع اشتراك', 'يرجى سداد القسط الشهري قبل نهاية الأسبوع.'],
  ['حضور', 'تم تسجيل حضورك في حصة الكيمياء.'],
  ['تغذية راجعة', 'أ. كريم عاصم أضاف تعليقًا على واجبك الأخير.'],
  ['اختبار قادم', 'اختبار اللغة العربية بعد ٣ أيام — راجع باب النحو.'],
  ['تغيير في الجدول', 'تم تغيير موعد حصة الفيزياء إلى الساعة ٦ مساءً.'],
  ['تقرير شهري', 'تم إصدار تقرير الأداء الشهري — تصفح نتائج ابنك.'],
  ['رسالة جديدة', 'أرسل مركز النيل للتعليم رسالة للطلاب.'],
];

export function notifications(page: number, limit: number) {
  const all: Notification[] = Array.from({ length: 26 }, (_, i) => {
    const [title, body] = NOTIF_TEMPLATES[i % NOTIF_TEMPLATES.length];
    return {
      id: `n-${i + 1}`,
      type: ['lesson', 'assignment', 'results', 'payment', 'attendance', 'feedback', 'exam', 'schedule', 'report', 'message'][i % 10],
      title,
      message: body,
      read: i >= 5,
      createdAt: atTime(-Math.floor(i / 2), '10:30'),
    };
  });
  const unread = all.filter((n) => !n.read).length;
  const { items, meta } = paginate(all, page, limit);
  return ok({ notifications: items, unread }, meta);
}

/* ------------------------------------------------------------------ */
/*  Payments (mine / teacher / admin summary)                          */
/* ------------------------------------------------------------------ */

const METHODS: { m: Payment['method']; ml: string }[] = [
  { m: 'VODAFONE_CASH', ml: 'فودافون كاش' },
  { m: 'INSTAPAY', ml: 'انستا باي' },
  { m: 'ORANGE_CASH', ml: 'أورنج كاش' },
  { m: 'TELDA', ml: 'تيلدا' },
  { m: 'ETISALAT_CASH', ml: 'اتصالات كاش' },
];

export function paymentsMine(page: number, limit: number, progress?: { type?: string; status?: string }) {
  const statuses: Payment['status'][] = ['PAID', 'PENDING', 'PAID', 'REJECTED', 'PAID', 'PAID', 'REFUNDED', 'PENDING', 'PAID', 'PENDING', 'PAID', 'PAID', 'PAID', 'PENDING', 'PAID', 'EXPIRED', 'PAID', 'PAID', 'PAID', 'PENDING'];
  const all: Payment[] = statuses.map((status, i) => {
    const amt = 150 + (i % 5) * 25;
    const method = METHODS[i % METHODS.length];
    return {
      id: `pay-${i + 1}`,
      paymentNumber: `PAY-2025-${String(1000 + i).padStart(4, '0')}`,
      payerName: 'محمد عادل',
      student: { id: 'stu-1', fullName: 'عمر محمد', photo: null },
      teacher: i % 3 === 0 ? { id: 't-01', fullName: 'د. أحمد عبد الرحمن' } : null,
      parent: { id: 'par-1', fullName: 'محمد عادل' },
      amount: amt,
      currency: 'EGP',
      type: i % 2 === 0 ? 'MONTHLY' : 'SESSION',
      method: method.m,
      methodLabel: method.ml,
      status,
      transactionReference: status === 'PAID' ? `TXN${1000000 + i}` : null,
      proofUrl: null,
      rejectionReason: status === 'REJECTED' ? 'التحويل غير واضح، يرجى إعادة الإرسال.' : null,
      paidAt: status === 'PAID' ? atTime(-(i % 10), '11:00') : null,
      createdAt: atTime(-(i % 12), '09:30'),
      lesson: i % 2 === 1 ? { id: `les-${i}`, subject: subj('sub-math')?.name ?? 'الرياضيات' } : null,
      subscription: i % 2 === 0 ? { id: `sub-${i}`, status: 'ACTIVE' } : null,
      history: [{ id: `h-${i}`, oldStatus: null, newStatus: status, changedByName: 'النظام', reason: null, createdAt: atTime(-(i % 12), '09:30') }],
    };
  });
  let filtered = all;
  if (progress?.type) filtered = filtered.filter((p) => p.type === progress.type!.toUpperCase());
  if (progress?.status) filtered = filtered.filter((p) => p.status === progress.status!.toUpperCase());
  const { items, meta } = paginate(filtered, page, limit);
  return ok(items, meta);
}

export function teacherPaymentSettings(): TeacherPaymentSettings {
  return {
    id: 'tps-1',
    sessionEnabled: true,
    monthlyEnabled: true,
    sessionPrice: 2200,
    monthlyPrice: 6500,
    vodafoneCash: '010 555 3333',
    etisalatCash: '011 555 3333',
    orangeCash: '012 555 3333',
    instaPay: 'ahmed@instapay',
    telda: null,
  };
}

export function adminPaymentSummary(): PaymentSummary {
  return {
    totalPayments: 62,
    paidCount: 41,
    pendingCount: 9,
    rejectedCount: 6,
    refundedCount: 6,
    totalRevenue: 184500,
    sessionRevenue: 71200,
    monthlyRevenue: 113300,
    currency: 'EGP',
    methodStats: [
      { method: 'VODAFONE_CASH', methodLabel: 'فودافون كاش', count: 24, revenue: 72100 },
      { method: 'INSTAPAY', methodLabel: 'انستا باي', count: 18, revenue: 54200 },
      { method: 'ORANGE_CASH', methodLabel: 'أورنج كاش', count: 10, revenue: 30800 },
      { method: 'TELDA', methodLabel: 'تيلدا', count: 5, revenue: 15200 },
      { method: 'ETISALAT_CASH', methodLabel: 'اتصالات كاش', count: 5, revenue: 12200 },
    ],
  };
}

/* ------------------------------------------------------------------ */
/*  Admin area                                                         */
/* ------------------------------------------------------------------ */

export function adminStats(): AdminStats {
  return {
    totalTeachers: 84,
    totalStudents: 620,
    totalParents: 410,
    totalLessons: 15400,
    activeLessons: 120,
    completedLessons: 9800,
    upcomingLessons: 620,
    totalExams: 230,
    totalAssignments: 340,
    averageTeacherRating: 4.6,
    newUsersThisMonth: 88,
    todayLessons: 45,
  };
}

const ADMIN_USER_POOL: [string, string, string, string, string][] = [
  ['عمر محمد', 'demo.student.1', 'STUDENT', 'ACTIVE', '+20 100 555 0404'],
  ['محمد عادل', 'demo.parent.1', 'PARENT', 'ACTIVE', '+20 100 555 0505'],
  ['د. أحمد عبد الرحمن', 'demo.teacher.1', 'TEACHER', 'ACTIVE', '+20 100 555 0303'],
  ['هاني الخطيب', 'demo.center.admin1', 'CENTER_ADMIN', 'ACTIVE', '+20 100 555 0202'],
  ['أحمد سمير', 'superadmin', 'SUPER_ADMIN', 'ACTIVE', '+20 100 555 0101'],
];

const ROLE_FIRST_NAMES = ['سلمى', 'يوسف', 'مريم', 'خالد', 'أميرة', 'مصطفى', 'رنا', 'كريم', 'سما', 'آدم', 'ليلي', 'طارق', 'نورهان', 'إيهاب', 'دعاء', 'سندس', 'عمر', 'أبانوب', 'جنى', 'حسين'];
const ROLE_LAST_NAMES = ['حسن', 'علي', 'إبراهيم', 'مصطفى', 'سليم', 'فوزي', 'رمضان', 'عشماوي', 'النجار', 'صبري', 'صالح', 'جمال', 'الخطيب', 'عبد الله', 'سعد', 'الشناوي', 'فتحي', 'يوسف', 'رمزي', 'حمدي'];

export function adminUsers(params: { role?: string; status?: string; search?: string; page?: number; limit?: number }) {
  const pool: AdminUser[] = Array.from({ length: 34 }, (_, i) => {
    if (i < ADMIN_USER_POOL.length) {
      const [fullName, username, role, status, phone] = ADMIN_USER_POOL[i];
      return {
        id: `au-${i}`,
        username,
        fullName,
        phone,
        photo: null,
        email: `${username}@demo.eg`,
        role: role as AdminUser['role'],
        status: status as AdminUser['status'],
        createdAt: `2024-${String((i % 12) + 1).padStart(2, '0')}-10T08:00:00.000Z`,
      };
    }
    const role = (['STUDENT', 'PARENT', 'TEACHER', 'PARENT', 'STUDENT', 'TEACHER'] as const)[i % 6];
    const fullName = `${ROLE_FIRST_NAMES[i % ROLE_FIRST_NAMES.length]} ${ROLE_LAST_NAMES[(i * 3) % ROLE_LAST_NAMES.length]}`;
    const status = i % 7 === 0 ? 'SUSPENDED' : i % 9 === 0 ? 'INACTIVE' : (i % 11 === 0 ? 'INVITED' : 'ACTIVE') as AdminUser['status'];
    return {
      id: `au-${i}`,
      username: `user.${i}.maarech`,
      fullName,
      phone: `+20 1${i % 10}0 ${String(555 + i).padStart(3, '0')} ${String(1000 + i).slice(1, 4)}`,
      photo: null,
      email: `user${i}@demo.eg`,
      role,
      status,
      createdAt: `2025-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}T09:00:00.000Z`,
    };
  });
  let list = pool;
  if (params.role) list = list.filter((u) => u.role === params.role);
  if (params.status) list = list.filter((u) => u.status === params.status);
  if (params.search) list = list.filter((u) => matchesSearch(params.search, u.fullName, u.username, u.email));
  const { items, meta } = paginate(list, params.page ?? 1, params.limit ?? 20);
  return ok(items, meta);
}

export function adminTeachers(params: { search?: string; page?: number; limit?: number }) {
  const SUBJECT_IDS = ['sub-math', 'sub-physics', 'sub-chem', 'sub-bio', 'sub-arabic', 'sub-english'];
  const pool: AdminTeacher[] = Array.from({ length: 26 }, (_, i) => {
    const fullName = `${ROLE_FIRST_NAMES[(i * 5) % ROLE_FIRST_NAMES.length]} ${ROLE_LAST_NAMES[(i * 7) % ROLE_LAST_NAMES.length]}`;
    const subjectId = SUBJECT_IDS[i % SUBJECT_IDS.length];
    const gradeId = ['g1s', 'g2s', 'g3s', 'g1pr', 'g2pr'][i % 5];
    return {
      id: `t-adm-${i}`,
      userId: `u-adm-${i}`,
      fullName,
      username: `teacher.${i}.maarech`,
      phone: `+20 1${i % 10}0 ${555 + i} 112${i % 10}`,
      photo: null,
      status: i % 11 === 0 ? 'SUSPENDED' : 'ACTIVE',
      location: { id: `loc-${i % 8}`, name: ['الزمالك', 'مدينة نصر', 'المعادي', 'الدقي', 'المهندسين', 'التجمع الخامس', 'السادس من أكتوبر', 'حلوان'][i % 8] },
      subjects: [subj(subjectId)?.name ?? subjectId],
      grades: [gr(gradeId)?.name ?? gradeId],
      hourlyRate: 120 + (i % 8) * 20,
      yearsExperience: 3 + (i % 11),
      students: 5 + (i % 15),
      lessons: 40 + (i % 50),
    };
  });
  let list = pool;
  if (params.search) list = list.filter((t) => matchesSearch(params.search, t.fullName, t.username, ...t.subjects));
  const { items, meta } = paginate(list, params.page ?? 1, params.limit ?? 20);
  return ok(items, meta);
}

export function adminLogs(page: number, limit: number) {
  const ACTIONS = ['login', 'approved_center', 'suspended_user', 'updated_center', 'created_teacher', 'updated_payment', 'refunded_payment', 'invited_employee', 'updated_catalog', 'deleted_center'];
  const pool: ActivityLog[] = Array.from({ length: 48 }, (_, i) => ({
    id: `log-${i + 1}`,
    user: { fullName: 'أحمد سمير', username: 'superadmin' },
    role: 'SUPER_ADMIN',
    action: ACTIONS[i % ACTIONS.length],
    entity: ['center', 'user', 'teacher', 'payment', 'catalog'][i % 5],
    entityId: `e-${1000 + i}`,
    details: i % 3 === 0 ? `تغيير حالة ${['مدفوع', 'معلق', 'موثق'][i % 3]} لسجل رقم ${i + 1}.` : null,
    createdAt: atTime(-Math.floor(i / 2), '09:15'),
  }));
  const { items, meta } = paginate(pool, page, limit);
  return ok(items, meta);
}

const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export function adminAnalytics(): AnalyticsData {
  return {
    studentsPerGrade: GRADES.map((g, i) => ({ grade: g.name, count: 20 + ((i * 11) % 60) })),
    studentGrowth: MONTHS_AR.map((month, i) => ({ month, count: 300 + i * 28 })),
    totalStudents: 620,
    activeStudents: 512,
    teachersPerSubject: SUBJECTS.map((s, i) => ({ subject: s.name, count: 2 + ((i * 7) % 12) })),
    studentsPerTeacher: ['د. أحمد عبد الرحمن', 'أستاذة منى السيد', 'أ. محمد فتحي', 'د. حسام الدين إبراهيم'].map((teacher, i) => ({ teacher, count: 9 + i * 5 })),
    teacherRatings: ['د. أحمد عبد الرحمن', 'أستاذة منى السيد', 'د. حسام الدين إبراهيم', 'أ. كريم عاصم'].map((teacher, i) => ({ teacher, average: 4.4 + i * 0.1, count: 30 + i * 20 })),
    lessonsPerMonth: MONTHS_AR.slice(0, 6).map((month, i) => ({ month, count: 900 + i * 130 })),
    busyDays: [0, 1, 2, 3, 4, 5, 6].map((day, i) => ({ day, count: 1200 - i * 140 })),
    busyHours: [9, 11, 13, 15, 17, 19, 21].map((hour, i) => ({ hour, count: 300 + i * 220 })),
    cancelledLessons: 62,
    completedLessons: 9800,
    subjectPopularity: SUBJECTS.slice(0, 6).map((s, i) => ({ subject: s.name, count: 100 - i * 10 })),
    exams: { total: 230, attempts: 1610, average: 84, highest: 100, lowest: 41, passRate: 0.93 },
    assignments: { total: 340, submitted: 284, late: 18, averageGrade: 88 },
  };
}

export function adminReports(type: string) {
  const base = {
    generatedAt: atTime(0, '12:00'),
    period: { from: daysFromNow(-30), to: daysFromNow(0) },
    counts: { teachers: 84, students: 620, lessons: 15400, payments: 184500 },
    detail: `تقرير ${type} التجريبي — بيانات توضيحية لأغراض العرض.`,
  };
  return ok(type === 'daily' ? { ...base, date: daysFromNow(0) } : type === 'monthly' ? { ...base, month: 'أغسطس 2025' } : base);
}

/* ------------------------------------------------------------------ */
/*  Less common helpers used by several screens                        */
/* ------------------------------------------------------------------ */

export function demoCatalog(id: string) {
  const c = centerById(id);
  if (!c) return null;
  return c;
}

export function availableSlotsForDate(teacherId: string, date: string | undefined): AvailableSlot[] {
  void date;
  const teacher = TEACHER_POOL_FOR_SLOTS.find((t) => t.id === teacherId);
  if (!teacher) return [];
  const day = date ? new Date(date + 'T12:00:00Z').getUTCDay() : new Date().getDay();
  return teacher.devAvail
    .filter((a) => a.day === day)
    .map((a, i) => ({
      date: date ?? daysFromNow(0),
      day,
      startTime: a.start,
      endTime: a.end,
      locationId: a.locationId,
      location: a.location,
      booked: ((teacher.id.length + i + day) % 4 === 0) && i !== 0,
      bookedByMe: false,
    }));
}

interface DevSlot { day: number; start: string; end: string; locationId: string; location: { id: string; name: string } | null }

const TEACHER_POOL_FOR_SLOTS: { id: string; devAvail: DevSlot[] }[] = [
  { id: 't-01', devAvail: [
    { day: 0, start: '16:00', end: '17:30', locationId: 'loc-zamalek', location: { id: 'loc-zamalek', name: 'الزمالك' } },
    { day: 2, start: '18:00', end: '19:30', locationId: 'loc-zamalek', location: { id: 'loc-zamalek', name: 'الزمالك' } },
    { day: 4, start: '17:00', end: '18:30', locationId: 'loc-zamalek', location: { id: 'loc-zamalek', name: 'الزمالك' } },
  ] },
];

export { fail };