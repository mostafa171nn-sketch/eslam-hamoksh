import type { AttendanceStatus } from '../lib/types';
import { SUBJECTS, GRADES, TEACHERS, LOCATIONS } from './catalog';
import { ok, fail, daysFromNow, atTime, paginate, matchesSearch } from './helpers';

/* ------------------------------------------------------------------ */
/*  Shared lists used across center screens                            */
/* ------------------------------------------------------------------ */

const subjName = (id: string) => SUBJECTS.find((s) => s.id === id)?.name ?? id;
const grName = (id: string) => GRADES.find((g) => g.id === id)?.name ?? id;
const locName = (id: string) => LOCATIONS.find((l) => l.id === id)?.name ?? id;

export function branchesBrief() {
  return ok([
    { id: 'br-1', name: 'الفرع الرئيسي — العجوزة' },
    { id: 'br-2', name: 'فرع المهندسين' },
    { id: 'br-3', name: 'فرع مدينة نصر' },
  ]);
}

export function branchesFull() {
  return ok([
    { id: 'br-1', name: 'الفرع الرئيسي — العجوزة', address: 'شارع سعيد ثابت، العجوزة', teacherCount: 9, roomCount: 6, lessonCount: 120, employeeCount: 8, createdAt: '2023-02-01T08:00:00.000Z' },
    { id: 'br-2', name: 'فرع المهندسين', address: 'شارع جامعة الدول العربية', teacherCount: 4, roomCount: 3, lessonCount: 55, employeeCount: 3, createdAt: '2023-06-15T08:00:00.000Z' },
    { id: 'br-3', name: 'فرع مدينة نصر', address: 'شارع عباس العقاد', teacherCount: 3, roomCount: 2, lessonCount: 40, employeeCount: 2, createdAt: '2024-03-01T08:00:00.000Z' },
  ]);
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */

const ROOM_TIMES = [
  { id: 'r-01', name: 'قاعة ١', status: 'IN_PROGRESS', lessons: [
    { id: 'rl-1', teacher: 'د. أحمد عبد الرحمن', subject: 'الرياضيات', grade: 'Grade 3 Secondary', startTime: '16:00', endTime: '17:30', status: 'IN_PROGRESS' },
    { id: 'rl-2', teacher: 'أ. كريم عاصم', subject: 'اللغة العربية', grade: 'Grade 3 Secondary', startTime: '18:00', endTime: '19:30', status: 'UPCOMING' },
  ] },
  { id: 'r-02', name: 'قاعة ٢', status: 'AVAILABLE', lessons: [
    { id: 'rl-3', teacher: 'د. حسام الدين إبراهيم', subject: 'الكيمياء', grade: 'Grade 2 Secondary', startTime: '16:00', endTime: '17:30', status: 'COMPLETED' },
  ] },
  { id: 'r-03', name: 'قاعة ٣', status: 'PENDING_CONFIRM', lessons: [
    { id: 'rl-4', teacher: 'أستاذة منى السيد', subject: 'الفيزياء', grade: 'Grade 3 Secondary', startTime: '17:30', endTime: '19:00', status: 'PENDING' },
  ] },
  { id: 'r-04', name: 'قاعة ٤', status: 'AVAILABLE', lessons: [
    { id: 'rl-5', teacher: 'أ. محمد فتحي', subject: 'الأحياء', grade: 'Grade 3 Secondary', startTime: '15:00', endTime: '16:30', status: 'COMPLETED' },
  ] },
  { id: 'r-05', name: 'قاعة ٥', status: 'IN_PROGRESS', lessons: [
    { id: 'rl-6', teacher: 'د. ياسر الشناوي', subject: 'الفيزياء والرياضيات', grade: 'Grade 2 Secondary', startTime: '16:00', endTime: '18:00', status: 'IN_PROGRESS' },
  ] },
];

export function centerDashboard(branchId?: string) {
  return ok({
    metrics: {
      occupancyRate: 78,
      todayIncome: 12450,
      totalCollected: 482100,
      completedLessonsToday: 14,
      todayLessons: 22,
      todayBookings: 6,
      teachersThisWeek: 12,
      activeStudents: 186,
      messages: { total: 24, unread: 7, lastAt: atTime(0, '09:14') },
      complaints: { total: 5, open: 2, critical: 1, high: 1, medium: 2, low: 1 },
      comparison: { prevMonthIncome: 406800, prevMonthCollected: 445900, prevMonthAvgDaily: 4749, prevYearAvgDaily: 4350 },
    },
    rooms: branchId && branchId !== 'br-1' ? ROOM_TIMES.slice(0, 2) : ROOM_TIMES,
    escalations: [
      { id: 'esc-1', kind: 'complaint', actionUrl: '/center/communications', subject: 'تأخر تسليم كشف الدرجات', severity: 'HIGH', assignee: null, createdAt: atTime(0, '08:40') },
      { id: 'esc-2', kind: 'booking', actionUrl: '/center/rooms', room: 'قاعة ٣', startTime: '17:30', endTime: '19:00', severity: 'MEDIUM', assignee: 'سكرتارية الفرع الرئيسي', createdAt: atTime(-1, '19:10') },
      { id: 'esc-3', kind: 'settlement', actionUrl: '/center/employees', teacher: 'أستاذة رانيا محمد', severity: 'LOW', assignee: null, createdAt: atTime(-2, '14:20') },
    ],
    recentMessages: [
      { id: 'm-1', sender: 'أولياء الأمور وأولياء الأمور', message: 'استفسار عن مواعيد حصص الرياضيات للصف الثاني الثانوي.', read: false, createdAt: atTime(0, '09:05') },
      { id: 'm-2', sender: 'أ. مصطفى النجار', message: 'سأحتاج توفير سبورة إضافية في قاعة ٤ الأسبوع القادم.', read: true, createdAt: atTime(-1, '21:30') },
    ],
    recentComplaints: [
      { id: 'c-1', severity: 'HIGH', subject: 'ارتفاع ضجيج القاعة المجاورة أثناء الحصة', status: 'IN_PROGRESS', createdAt: atTime(0, '08:10') },
      { id: 'c-2', severity: 'MEDIUM', subject: 'تكييف قاعة ٢ لا يعمل بشكل جيد', status: 'OPEN', createdAt: atTime(-1, '17:45') },
      { id: 'c-3', severity: 'LOW', subject: 'طلب تحويل موعد حصة', status: 'RESOLVED', createdAt: atTime(-3, '11:20') },
    ],
  });
}

/* ------------------------------------------------------------------ */
/*  Dead dashboard hook endpoints (kept for safety)                    */
/* ------------------------------------------------------------------ */

export function centerStats() {
  return ok({
    totalRooms: 12,
    totalTeachers: 18,
    totalStudents: 240,
    totalEmployees: 12,
    totalBranches: 3,
    todayLessons: 22,
    completedLessons: 14,
    upcomingLessons: 8,
    cancelledLessons: 1,
    todayAttendance: { present: 118, absent: 14, late: 9, excused: 3, total: 144 },
    todayRevenue: 12450,
    pendingPayments: 9,
    paidPayments: 41,
    activeEnrollments: 210,
    pendingEnrollments: 12,
  });
}

export function lessonsToday(date?: string) {
  const d = date ?? daysFromNow(0);
  const lessons = [
    { id: 'lt-1', subject: 'الرياضيات', teacher: 'د. أحمد عبد الرحمن', teacherId: 't-01', grade: 'Grade 3 Secondary', room: 'قاعة ١', branch: 'الفرع الرئيسي — العجوزة', date: d, startTime: '16:00', endTime: '17:30', studentCount: 24, enrolledCount: 24, status: 'IN_PROGRESS' },
    { id: 'lt-2', subject: 'اللغة العربية', teacher: 'أ. كريم عاصم', teacherId: 't-07', grade: 'Grade 3 Secondary', room: 'قاعة ١', branch: 'الفرع الرئيسي — العجوزة', date: d, startTime: '18:00', endTime: '19:30', studentCount: 18, enrolledCount: 18, status: 'SCHEDULED' },
    { id: 'lt-3', subject: 'الكيمياء', teacher: 'د. حسام الدين إبراهيم', teacherId: 't-05', grade: 'Grade 2 Secondary', room: 'قاعة ٢', branch: 'الفرع الرئيسي — العجوزة', date: d, startTime: '16:00', endTime: '17:30', studentCount: 15, enrolledCount: 15, status: 'COMPLETED' },
    { id: 'lt-4', subject: 'الفيزياء', teacher: 'أستاذة منى السيد', teacherId: 't-02', grade: 'Grade 3 Secondary', room: 'قاعة ٣', branch: 'الفرع الرئيسي — العجوزة', date: d, startTime: '17:30', endTime: '19:00', studentCount: 20, enrolledCount: 20, status: 'SCHEDULED' },
    { id: 'lt-5', subject: 'الأحياء', teacher: 'أ. محمد فتحي', teacherId: 't-03', grade: 'Grade 3 Secondary', room: 'قاعة ٤', branch: 'الفرع الرئيسي — العجوزة', date: d, startTime: '15:00', endTime: '16:30', studentCount: 16, enrolledCount: 16, status: 'COMPLETED' },
    { id: 'lt-6', subject: 'الرياضيات', teacher: 'د. ياسر الشناوي', teacherId: 't-09', grade: 'Grade 2 Secondary', room: 'قاعة ٥', branch: 'فرع المهندسين', date: d, startTime: '16:00', endTime: '18:00', studentCount: 12, enrolledCount: 12, status: 'IN_PROGRESS' },
  ];
  return ok(lessons);
}

export function centerClassrooms() {
  return ok([
    { id: 'r-01', name: 'قاعة ١', capacity: 30, branch: 'الفرع الرئيسي — العجوزة', status: 'ACTIVE' },
    { id: 'r-02', name: 'قاعة ٢', capacity: 24, branch: 'الفرع الرئيسي — العجوزة', status: 'ACTIVE' },
    { id: 'r-03', name: 'قاعة ٣', capacity: 24, branch: 'الفرع الرئيسي — العجوزة', status: 'ACTIVE' },
    { id: 'r-04', name: 'قاعة ٤', capacity: 20, branch: 'الفرع الرئيسي — العجوزة', status: 'ACTIVE' },
    { id: 'r-05', name: 'قاعة ٥', capacity: 16, branch: 'فرع المهندسين', status: 'ACTIVE' },
    { id: 'r-06', name: 'قاعة ٦', capacity: 16, branch: 'فرع مدينة نصر', status: 'INACTIVE' },
  ]);
}

/* ------------------------------------------------------------------ */
/*  Students                                                           */
/* ------------------------------------------------------------------ */

const STUDENT_FIRST = ['عمر', 'نور', 'سلمى', 'يوسف', 'مريم', 'خالد', 'أميرة', 'مصطفى', 'رنا', 'كريم', 'سما', 'آدم', 'ليلي', 'طارق', 'نورهان', 'إيهاب', 'دعاء', 'سندس', 'أبانوب', 'جنى', 'حسين', 'فرح', 'زياد', 'ملك'];
const STUDENT_LAST = ['محمد', 'حسن', 'علي', 'إبراهيم', 'سليم', 'فوزي', 'رمضان', 'عشماوي', 'النجار', 'صبري', 'صالح', 'جمال', 'الخطيب', 'عبد الله', 'سعد', 'الشناوي', 'فتحي', 'يوسف', 'رمزي', 'حمدي'];
const GRP_IDS = ['g-g1s-math', 'g-g1s-ar', 'g-g3s-math', 'g-g2s-chem', 'g-g3pr-en', 'g-g1p-math'];

function studentsPool() {
  const rows = Array.from({ length: 24 }, (_, i) => {
    const fullName = `${STUDENT_FIRST[i % STUDENT_FIRST.length]} ${STUDENT_LAST[(i * 3) % STUDENT_LAST.length]}`;
    const gradeId = GRADES[(i * 3) % GRADES.length].id;
    const gradeName = grName(gradeId);
    const due = i % 3 === 0;
    const needs = i % 5 === 0;
    return {
      id: `stu-row-${i + 1}`,
      userId: `u-sr-${i + 1}`,
      studentId: `stu-row-${i + 1}`,
      fullName,
      username: `student.${i + 1}.democenter`,
      phone: `+20 1${i % 10}0 555 ${String(1000 + i).slice(1, 4)}`,
      photo: null,
      status: i % 9 === 0 ? 'SUSPENDED' : 'ACTIVE',
      studentNumber: `STU-2025-${String(1000 + i).padStart(4, '0')}`,
      code: `STU-2025-${String(1000 + i).padStart(4, '0')}`,
      grade: gradeName,
      parent: i % 2 === 0 ? `${STUDENT_LAST[(i * 5) % STUDENT_LAST.length]} ولي أمر` : 'السيد أحمد فتحي',
      parentPhone: i % 2 === 0 ? '+20 100 654 3210' : '+20 111 789 0000',
      groupCount: (i % 4) + 1,
      groups: [
        { id: GRP_IDS[(i) % GRP_IDS.length], groupId: GRP_IDS[(i) % GRP_IDS.length], name: Object.values({ 'g-g1s-math': 'مجموعة رياضيات أولى ثانوي', 'g-g1s-ar': 'مجموعة عربية أولى ثانوي', 'g-g3s-math': 'مجموعة رياضيات تالتة ثانوي', 'g-g2s-chem': 'مجموعة كيمياء تانية ثانوي', 'g-g3pr-en': 'مجموعة إنجليزي ثالثة إعدادي', 'g-g1p-math': 'مجموعة رياضيات أولى ابتدائي' })[i % 6], subject: subjName(['sub-math', 'sub-arabic', 'sub-chem', 'sub-english'][i % 4]), stage: gradeName.split(' ').slice(-1)[0] as string | null },
      ],
      enrollmentStatus: needs ? 'PENDING' : 'ACTIVE',
      financialStatus: due ? (needs ? 'NEEDS_MATCHING' : 'DUE') : 'PAID',
      amountDue: due ? (i % 3) + 1 : 0,
      totalCollected: 1200 + (i % 8) * 250,
      attendanceRate: 72 + ((i * 7) % 28),
      lastAttendance: atTime(-(i % 6), '17:30'),
      lastAttendanceStatus: i % 4 === 1 ? 'ABSENT' : i % 4 === 2 ? 'LATE' : 'PRESENT',
      hasMissingAttendance: i % 6 === 0,
    };
  });
  return rows;
}

export function centerStudentsStats() {
  return ok({ totalStudents: 240, activeStudents: 210, pendingEnrollments: 12, overduePayments: 9, needsMatching: 16 });
}

export function centerStudents(params: { limit?: number; search?: string; financialStatus?: string; registrationStatus?: string; page?: number }) {
  let list = studentsPool();
  if (params.search) list = list.filter((s) => matchesSearch(params.search, s.fullName, s.username, s.studentNumber, s.grade ?? ''));
  if (params.financialStatus) list = list.filter((s) => s.financialStatus === params.financialStatus);
  if (params.registrationStatus) {
    const want = params.registrationStatus.toUpperCase();
    list = list.filter((s) => (want === 'ACTIVE' ? s.enrollmentStatus === 'ACTIVE' : s.enrollmentStatus !== 'ACTIVE'));
  }
  const { items, meta } = paginate(list, params.page ?? 1, params.limit ?? 100);
  return ok(items, meta);
}

export function centerStudentsFormData() {
  return ok({
    groups: [
      { id: 'g-g1s-math', name: 'مجموعة رياضيات أولى ثانوي' },
      { id: 'g-g1s-ar', name: 'مجموعة عربية أولى ثانوي' },
      { id: 'g-g3s-math', name: 'مجموعة رياضيات تالتة ثانوي' },
      { id: 'g-g2s-chem', name: 'مجموعة كيمياء تانية ثانوي' },
      { id: 'g-g3pr-en', name: 'مجموعة إنجليزي ثالثة إعدادي' },
      { id: 'g-g1p-math', name: 'مجموعة رياضيات أولى ابتدائي' },
    ],
    grades: GRADES.map((g) => ({ id: g.id, name: g.name })),
  });
}

export function centerStudentDetail(id: string): { status: number; response: unknown } {
  const row = studentsPool().find((s) => s.id === id);
  if (!row) return { status: 404, response: fail('الطالب غير موجود.') };
  return {
    status: 200,
    response: ok({
      id: row.id,
      code: row.studentNumber,
      fullName: row.fullName,
      username: row.username,
      phone: row.phone,
      email: `${row.username}@democenter.eg`,
      photo: null,
      status: row.status,
      enrollmentStatus: row.enrollmentStatus,
      grade: row.grade,
      joinedAt: '2024-09-01T09:00:00.000Z',
      parent: { id: 'par-sr-1', fullName: row.parent ?? 'ولية الأمر', phone: row.parentPhone },
      teachers: TEACHERS.slice(0, 3).map((t) => ({ id: t.id, fullName: t.fullName })),
      subjects: row.groups.map((g: { subject: string }) => g.subject),
      groups: row.groups.map((g: { id: string; groupId: string; name: string; subject: string; stage: string | null }) => ({
        enrollmentId: `${row.id}-${g.groupId}`,
        groupId: g.groupId,
        slug: (g.name ?? '').replace(/\s+/g, '-').toLowerCase(),
        name: g.name,
        subject: g.subject,
        stage: g.stage,
        teacher: row.groups[0].name.includes('رياضيات') ? 'د. أحمد عبد الرحمن' : 'أ. كريم عاصم',
        room: 'قاعة ١',
        branch: 'الفرع الرئيسي — العجوزة',
        dayOfWeek: 3,
      })),
      attendance: [
        { id: 'sa-1', lessonId: 'ls-1', date: daysFromNow(-1), time: '16:00', subject: subjName('sub-math'), status: 'PRESENT', method: 'QR', markedAt: atTime(-1, '17:34') },
        { id: 'sa-2', lessonId: 'ls-2', date: daysFromNow(-2), time: '18:00', subject: subjName('sub-arabic'), status: 'LATE', method: 'MANUAL', markedAt: atTime(-2, '18:22') },
        { id: 'sa-3', lessonId: 'ls-3', date: daysFromNow(-4), time: '16:00', subject: subjName('sub-chem'), status: 'ABSENT', method: 'MANUAL', markedAt: atTime(-4, '19:00') },
        { id: 'sa-4', lessonId: 'ls-4', date: daysFromNow(-5), time: '15:00', subject: subjName('sub-physics'), status: 'PRESENT', method: 'QR', markedAt: atTime(-5, '16:34') },
        { id: 'sa-5', lessonId: 'ls-5', date: daysFromNow(-7), time: '16:00', subject: subjName('sub-math'), status: 'PRESENT', method: 'SYSTEM', markedAt: atTime(-7, '17:34') },
      ],
      attendanceRate: row.attendanceRate ?? 85,
      attendanceCount: 40,
      financial: { status: row.financialStatus, amountDue: row.amountDue * 100, totalCollected: row.totalCollected * 100 },
      payments: [
        { id: 'cp-1', paymentNumber: 'PAY-2025-1001', amount: 30000, status: 'PAID', type: 'MONTHLY', method: 'فودافون كاش', createdAt: atTime(-10, '10:00'), paidAt: atTime(-10, '11:00'), linkedToLesson: false, lessonDate: null, lessonSubject: null },
        { id: 'cp-2', paymentNumber: 'PAY-2025-1012', amount: 22000, status: 'PENDING', type: 'SESSION', method: 'انستا باي', createdAt: atTime(-3, '16:00'), paidAt: null, linkedToLesson: true, lessonDate: daysFromNow(1), lessonSubject: subjName('sub-math') },
      ],
      lastAttendance: { status: 'PRESENT', markedAt: atTime(-1, '17:34'), source: 'qr' },
    }),
  };
}

export function studentCommunications() {
  return ok([
    { id: 'comm-1', body: 'نشكر ولي الأمر على التواصل؛ تم تأكيد تسجيل الطالب في مجموعة الرياضيات.', authorName: 'هاني الخطيب', createdAt: atTime(-8, '12:00') },
    { id: 'comm-2', body: 'استفسار عن مواعيد الحصص وموعد اختبار الجبر الشهري.', authorName: 'ولية أمر الطالب', createdAt: atTime(-2, '18:45') },
  ]);
}

/* ------------------------------------------------------------------ */
/*  Teachers (center)                                                  */
/* ------------------------------------------------------------------ */

function centerTeachersPool() {
  return TEACHERS.map((t, i) => ({
    id: t.id,
    userId: `u-${t.id}`,
    fullName: t.fullName,
    username: `teacher.${i + 1}.democenter`,
    phone: `+20 1${i % 10}0 555 ${String(2000 + i).slice(1, 4)}`,
    email: t.fullName.includes('د') ? `dr${i + 1}@democenter.eg` : `mr${i + 1}@democenter.eg`,
    photo: null,
    status: i % 11 === 0 ? 'SUSPENDED' : 'ACTIVE',
    bio: t.bio,
    yearsExperience: t.yearsExperience,
    hourlyRate: t.hourlyRate,
    createdAt: '2024-01-15T09:00:00.000Z',
    subjects: t.subjects.map((s) => s.id),
    grades: t.grades.map((g) => g.id),
    branch: i % 3 === 1 ? 'فرع المهندسين' : i % 4 === 2 ? 'فرع مدينة نصر' : 'الفرع الرئيسي — العجوزة',
    location: t.location ? t.location.name : null,
    studentCount: 6 + (i * 3) % 18,
    lessonCount: 45 + (i * 7) % 110,
    groupCount: (i % 3) + 1,
    pendingBookings: i % 5 === 0 ? 2 : 0,
    openSettlements: i % 6 === 0 ? 1 : 0,
    needsAction: i % 4 === 0,
    agreement: { type: i % 3 === 0 ? 'monthly' : 'session', amount: i % 3 === 0 ? 6500 : 2200 },
    rating: t.rating,
    ratingCount: t.ratingCount,
  }));
}

export function centerTeachersAll(params: { page?: number; limit?: number; search?: string; status?: string; branchId?: string }) {
  let list = centerTeachersPool();
  if (params.search) list = list.filter((t) => matchesSearch(params.search, t.fullName, t.username));
  if (params.status) list = list.filter((t) => t.status === params.status);
  if (params.branchId) list = list.filter((t) => t.branch !== 'الفرع الرئيسي — العجوزة' || params.branchId === 'br-1');
  const { items, meta } = paginate(list, params.page ?? 1, params.limit ?? 20);
  return ok(items, meta);
}

export function centerTeachersQueue() {
  return ok({
    roomRequests: [
      { id: 'req-1', room: 'قاعة ٥', teacherId: 't-15', teacher: 'أ. مصطفى النجار', subject: 'الإحصاء', group: 'مجموعة إحصاء أولى ثانوي', note: 'يفضّل قاعة قريبة من المدخل.', dayOfWeek: 2, date: null, startTime: '17:00', endTime: '18:30', recurrence: 'WEEKLY', createdAt: atTime(-1, '15:00') },
      { id: 'req-2', room: 'قاعة ٢', teacherId: 't-16', teacher: 'د. شيماء عبد الله', subject: 'الفيزياء', group: null, note: null, dayOfWeek: null, date: daysFromNow(4), startTime: '18:30', endTime: '20:00', recurrence: 'ONE_TIME', createdAt: atTime(-2, '13:20') },
    ],
    overdueRoomRequests: 1,
    settlementsDue: [
      { id: 'stl-1', teacherId: 't-07', teacher: 'أ. كريم عاصم', period: '2025-07', status: 'CALCULATED', grossAmount: 128000, teacherShare: 83200, centerShare: 44800, createdAt: atTime(-4, '10:00') },
      { id: 'stl-2', teacherId: 't-20', teacher: 'د. مريم جمال', period: '2025-07', status: 'APPROVED', grossAmount: 94000, teacherShare: 61100, centerShare: 32900, createdAt: atTime(-6, '11:30') },
    ],
    teachersNeedingAction: centerTeachersPool()
      .filter((t) => t.needsAction)
      .slice(0, 3)
      .map((t) => ({ id: t.id, userId: t.userId, fullName: t.fullName, status: t.status, subjects: t.subjects, agreement: t.agreement, pendingActions: 1, pendingBookings: t.pendingBookings, openSettlements: t.openSettlements, studentCount: t.studentCount, groupCount: t.groupCount })),
  });
}

export function centerTeacherDetail(id: string): { status: number; response: unknown } {
  const t = centerTeachersPool().find((x) => x.id === id);
  if (!t) return { status: 404, response: fail('المعلم غير موجود.') };
  return {
    status: 200,
    response: ok({
      id: t.id,
      userId: t.userId,
      bio: t.bio,
      yearsExperience: t.yearsExperience,
      hourlyRate: t.hourlyRate,
      photo: null,
      createdAt: t.createdAt,
      user: { id: t.userId, fullName: t.fullName, username: t.username, phone: t.phone, email: t.email, photo: null, status: t.status },
      subjects: t.subjects.map((s: string) => ({ subject: { id: s, name: subjName(s) } })),
      grades: t.grades.map((g: string) => ({ grade: { id: g, name: grName(g) } })),
      location: t.location ? { id: 'loc-1', name: t.location } : null,
      ratings: [
        { stars: 5, comment: 'شرح ممتاز ومتابعة مستمرة مع ولي الأمر.', createdAt: atTime(-9, '12:00') },
        { stars: 4, comment: 'حصة مفيدة، نتمنى مزيدًا من التدريبات.', createdAt: atTime(-20, '14:00') },
      ],
      agreement: t.agreement,
      stats: { activeBookings: 6 + (t.studentCount % 5), groups: t.groupCount, students: t.studentCount, dueSettlement: t.openSettlements },
      groups: [
        { id: 'tg-1', name: `مجموعة ${subjName(t.subjects[0])} ${t.fullName.split(' ').pop()}`, room: 'قاعة ١', subject: subjName(t.subjects[0]), dayOfWeek: 3, startTime: '16:00', endTime: '17:30', capacity: 30, studentCount: t.studentCount },
      ],
      bookings: [
        { id: 'tb-1', room: 'قاعة ١', group: null, date: daysFromNow(2), dayOfWeek: null, startTime: '16:00', endTime: '17:30', recurrence: 'ONE_TIME', status: 'PENDING', createdAt: atTime(-1, '18:00') },
        { id: 'tb-2', room: 'قاعة ٣', group: 'مجموعة المعادلات', date: null, dayOfWeek: 1, startTime: '17:30', endTime: '19:00', recurrence: 'WEEKLY', status: 'APPROVED', createdAt: atTime(-10, '12:00') },
      ],
      payments: [
        { id: 'tp-1', paymentNumber: 'PAY-2025-1110', student: 'عمر محمد', amount: 2200, type: 'SESSION', status: 'PAID', createdAt: atTime(-12, '10:00') },
      ],
      settlements: [
        { id: 'ts-1', period: '2025-07', status: 'PAID', grossAmount: 128000, platformCommission: 1280, teacherShare: 83200, centerShare: 44800, netAmount: 81920, settledAt: atTime(-2, '13:00'), createdAt: atTime(-8, '09:00') },
      ],
      conversations: [
        { id: 'tc-1', student: { id: 'stu-1', fullName: 'عمر محمد' }, updatedAt: atTime(-1, '20:00'), messages: [
          { id: 'tc-1-m1', senderRole: 'CENTER_ADMIN', body: 'تم تأكيد موعد الحصة القادمة مساء الجمعة.', read: true, createdAt: atTime(-1, '20:00') },
          { id: 'tc-1-m2', senderRole: 'PARENT', body: 'شكرًا لكم، ملتزمون بالموعد.', read: true, createdAt: atTime(-1, '21:30') },
        ] },
      ],
      complaints: [
        { id: 'tcomp-1', code: 'CMP-101', subject: 'تأخر موعد الحصة عن الجدول', description: 'طلب ملاحظة لتعديل الموعد لتجنب الازدحام.', severity: 'MEDIUM', status: 'IN_PROGRESS', createdAt: atTime(-3, '16:00') },
      ],
      activity: [
        { id: 'tact-1', action: 'created_teacher', details: 'إنشاء حساب المعلم عبر لوحة الإدارة.', user: 'هاني الخطيب', createdAt: atTime(-30, '09:00') },
        { id: 'tact-2', action: 'sent_center_message', details: 'إرسال رسالة ترحيبية للمعلم.', user: 'هاني الخطيب', createdAt: atTime(-29, '10:30') },
      ],
      students: [
        { id: 'stu-1', fullName: 'عمر محمد', grade: 'Grade 1 Secondary' },
        { id: 'stu-4', fullName: 'عبدالله خالد', grade: 'Grade 1 Secondary' },
      ],
    }),
  };
}

/* ------------------------------------------------------------------ */
/*  Groups                                                             */
/* ------------------------------------------------------------------ */

function groupsPool() {
  const base: { id: string; name: string; slug: string; stage: string | null; status: string; teacherId: string | null; teacher: string | null; room: string | null; roomId: string | null; branch: string | null; subject: string | null; dayOfWeek: number | null; startTime: string | null; endTime: string | null; capacity: number | null; studentCount: number; agreement: { type: 'session' | 'monthly'; amount: number } }[] = [
    { id: 'g-g1s-math', name: 'مجموعة رياضيات أولى ثانوي', slug: 'group-math-g1s', stage: 'أولى ثانوي', status: 'ACTIVE', teacherId: 't-15', teacher: 'أ. مصطفى النجار', room: 'قاعة ١', roomId: 'r-01', branch: 'الفرع الرئيسي — العجوزة', subject: 'الرياضيات', dayOfWeek: 3, startTime: '16:00', endTime: '17:30', capacity: 30, studentCount: 24, agreement: { type: 'monthly', amount: 6500 } },
    { id: 'g-g1s-ar', name: 'مجموعة عربية أولى ثانوي', slug: 'group-ar-g1s', stage: 'أولى ثانوي', status: 'ACTIVE', teacherId: 't-14', teacher: 'أستاذة إيمان رشدي', room: 'قاعة ٢', roomId: 'r-02', branch: 'الفرع الرئيسي — العجوزة', subject: 'اللغة العربية', dayOfWeek: 1, startTime: '17:30', endTime: '19:00', capacity: 24, studentCount: 18, agreement: { type: 'monthly', amount: 5400 } },
    { id: 'g-g3s-math', name: 'مجموعة رياضيات تالتة ثانوي', slug: 'group-math-g3s', stage: 'تالتة ثانوي', status: 'ACTIVE', teacherId: 't-01', teacher: 'د. أحمد عبد الرحمن', room: 'قاعة ١', roomId: 'r-01', branch: 'الفرع الرئيسي — العجوزة', subject: 'الرياضيات', dayOfWeek: 5, startTime: '16:00', endTime: '18:00', capacity: 30, studentCount: 27, agreement: { type: 'monthly', amount: 8200 } },
    { id: 'g-g2s-chem', name: 'مجموعة كيمياء تانية ثانوي', slug: 'group-chem-g2s', stage: 'تانية ثانوي', status: 'NEEDS_ROOM', teacherId: 't-05', teacher: 'د. حسام الدين إبراهيم', room: null, roomId: null, branch: null, subject: 'الكيمياء', dayOfWeek: null, startTime: null, endTime: null, capacity: 20, studentCount: 9, agreement: { type: 'session', amount: 2200 } },
    { id: 'g-g3pr-en', name: 'مجموعة إنجليزي ثالثة إعدادي', slug: 'group-en-g3pr', stage: 'ثالثة إعدادي', status: 'ACTIVE', teacherId: 't-21', teacher: 'أ. هاني العشماوي', room: 'قاعة ٣', roomId: 'r-03', branch: 'فرع المهندسين', subject: 'اللغة الإنجليزية', dayOfWeek: 6, startTime: '11:00', endTime: '12:30', capacity: 20, studentCount: 15, agreement: { type: 'monthly', amount: 4800 } },
    { id: 'g-g1p-math', name: 'مجموعة رياضيات أولى ابتدائي', slug: 'group-math-g1p', stage: 'أولى ابتدائي', status: 'ACTIVE', teacherId: 't-13', teacher: 'أ. طارق سامح', room: 'قاعة ٤', roomId: 'r-04', branch: 'الفرع الرئيسي — العجوزة', subject: 'الرياضيات', dayOfWeek: 2, startTime: '10:00', endTime: '11:00', capacity: 16, studentCount: 12, agreement: { type: 'session', amount: 1600 } },
  ];
  return base;
}

export function centerGroupsSummary() {
  const groups = groupsPool();
  return ok({ active: groups.filter((g) => g.status === 'ACTIVE').length, needsRoom: groups.filter((g) => g.status === 'NEEDS_ROOM').length, students: groups.reduce((a, g) => a + g.studentCount, 0), total: groups.length });
}

export function centerGroups(params: { search?: string; teacherId?: string; roomId?: string }) {
  let list = groupsPool();
  if (params.search) list = list.filter((g) => matchesSearch(params.search, g.name, g.teacher ?? '', g.branch ?? ''));
  if (params.teacherId) list = list.filter((g) => g.teacherId === params.teacherId);
  if (params.roomId) list = list.filter((g) => g.roomId === params.roomId);
  const { items, meta } = paginate(list, 1, 100);
  return ok(items, meta);
}

export function groupsFormData() {
  return ok({
    groups: groupsPool().map((g) => ({ id: g.id, name: g.name })),
    grades: GRADES.map((g) => ({ id: g.id, name: g.name })),
    students: [{ id: 'stu-1', name: 'عمر محمد' }, { id: 'stu-4', name: 'عبدالله خالد' }, ...studentsPool().slice(0, 10).map((s) => ({ id: s.id, name: s.fullName }))],
    teachers: [{ id: 't-01', name: 'د. أحمد عبد الرحمن' }, ...TEACHERS.slice(1, 9).map((t) => ({ id: t.id, name: t.fullName }))],
    rooms: centerClassrooms2().map((r) => ({ id: r.id, name: r.name })),
  });
}

function centerClassrooms2() {
  return [
    { id: 'r-01', name: 'قاعة ١' },
    { id: 'r-02', name: 'قاعة ٢' },
    { id: 'r-03', name: 'قاعة ٣' },
    { id: 'r-04', name: 'قاعة ٤' },
  ];
}

export function centerGroupDetail(slug: string): { status: number; response: unknown } {
  const g = groupsPool().find((x) => x.id === slug || x.slug === slug);
  if (!g) return { status: 404, response: fail('المجموعة غير موجودة.') };
  return {
    status: 200,
    response: ok({
      id: g.id,
      name: g.name,
      slug: g.slug,
      stage: g.stage,
      status: g.status,
      capacity: g.capacity,
      dayOfWeek: g.dayOfWeek,
      startTime: g.startTime,
      endTime: g.endTime,
      teacherId: g.teacherId,
      teacher: g.teacher,
      room: g.room,
      roomId: g.roomId,
      branch: g.branch,
      subject: g.subject,
      agreement: g.agreement,
      students: studentsPool()
        .slice(0, 6)
        .map((s, i) => ({
          id: s.id,
          name: s.fullName,
          enrolledAt: '2025-01-15T09:00:00.000Z',
          status: 'ACTIVE',
          totalPaid: (g.agreement.amount * 2) / 100,
          financialStatus: i % 3 === 0 ? 'DUE' : 'PAID',
          lastAttendance: i % 2 === 0 ? atTime(-1, '17:30') : null,
        })),
    }),
  };
}

/* ------------------------------------------------------------------ */
/*  Employees                                                          */
/* ------------------------------------------------------------------ */

const EMP_ROLES = ['CENTER_EMPLOYEE', 'RECEPTIONIST', 'TEACHER_ASSISTANT'];

function employeesPool() {
  return Array.from({ length: 12 }, (_, i) => {
    const fullName = `${STUDENT_LAST[(i * 5) % STUDENT_LAST.length]} ${STUDENT_FIRST[(i * 7) % STUDENT_FIRST.length]}`;
    return {
      id: `emp-${i + 1}`,
      fullName,
      username: `employee.${i + 1}.democenter`,
      phone: `+20 1${i % 10}0 555 ${String(4000 + i).slice(1, 4)}`,
      email: `emp${i + 1}@democenter.eg`,
      role: i === 0 ? 'CENTER_ADMIN' : EMP_ROLES[i % EMP_ROLES.length],
      status: i % 10 === 0 ? 'PENDING' : i % 11 === 0 ? 'INACTIVE' : 'ACTIVE',
      photo: null,
      createdAt: '2024-02-10T09:00:00.000Z',
      updatedAt: atTime(-(i % 8), '09:00'),
      lastActivity: i % 3 === 0 ? { action: 'تسجيل شكوى قاعة ٢', createdAt: atTime(-(i % 4), '08:30') } : null,
      openTaskCount: i % 4,
      centerName: 'مركز النيل للتعليم',
    };
  });
}

export function centerStaff(params: { page?: number; limit?: number; role?: string; status?: string; search?: string }) {
  let list = employeesPool() as unknown as Record<string, unknown>[];
  if (params.role) list = list.filter((e) => e.role === params.role);
  if (params.status) list = list.filter((e) => e.status === params.status);
  if (params.search) list = list.filter((e) => matchesSearch(params.search, String(e.fullName), String(e.username)));
  const { items, meta } = paginate(list, params.page ?? 1, params.limit ?? 20);
  return ok(items, meta);
}

export function centerStaffStats() {
  const pool = employeesPool();
  return ok({
    totalEmployees: pool.length,
    activeEmployees: pool.filter((e) => e.status === 'ACTIVE').length,
    pendingInvitations: pool.filter((e) => e.status === 'PENDING').length,
    activeRoles: 4,
    openTasks: pool.reduce((a, e) => a + e.openTaskCount, 0),
    suspendedCount: pool.filter((e) => e.status === 'INACTIVE').length,
    changesToday: 3,
  });
}

export function centerPermissionMatrix() {
  return ok({
    roles: [
      { role: 'CENTER_EMPLOYEE', modules: [
        { domain: 'students', ops: ['view', 'create', 'update'] },
        { domain: 'attendance', ops: ['view', 'mark'] },
        { domain: 'messages', ops: ['view', 'send'] },
        { domain: 'payments', ops: ['view'] },
      ] },
      { role: 'RECEPTIONIST', modules: [
        { domain: 'students', ops: ['view', 'create'] },
        { domain: 'bookings', ops: ['view', 'create', 'cancel'] },
        { domain: 'payments', ops: ['view', 'create'] },
      ] },
      { role: 'TEACHER_ASSISTANT', modules: [
        { domain: 'attendance', ops: ['view', 'mark'] },
        { domain: 'assignments', ops: ['view', 'grade'] },
        { domain: 'exams', ops: ['view'] },
      ] },
    ],
  });
}

export function centerEmployeesList(params: { limit?: number }) {
  const list = employeesPool().map((e) => ({ id: e.id, fullName: e.fullName, role: e.role }));
  const { items } = paginate(list, 1, params.limit ?? 200);
  return ok(items);
}

export function centerEmployeeDetail(id: string): { status: number; response: unknown } {
  const e = employeesPool().find((x) => x.id === id);
  if (!e) return { status: 404, response: fail('الموظف غير موجود.') };
  return {
    status: 200,
    response: ok({ id: e.id, fullName: e.fullName, username: e.username, phone: e.phone, email: e.email, role: e.role, status: e.status, photo: null, createdAt: e.createdAt, permissions: ['students.view', 'attendance.mark', 'messages.send'], openTaskCount: e.openTaskCount, lastActivity: e.lastActivity, centerName: e.centerName }),
  };
}

export function centerTasks(assigneeId?: string) {
  const pool = Array.from({ length: 8 }, (_, i) => ({
    id: `task-${i + 1}`,
    title: i % 3 === 0 ? 'مراجعة كشوف حضور هذا الأسبوع' : i % 3 === 1 ? 'متابعة تسويات يوليو' : 'تحديث بيانات الطلاب الجدد',
    description: i % 2 === 0 ? 'طلبات معلقة من أولياء الأمور بخصوص الحصص.' : null,
    status: i % 4 === 0 ? 'DONE' : i % 4 === 1 ? 'IN_PROGRESS' : 'OPEN',
    dueAt: i % 3 === 0 ? atTime(2, '17:00') : null,
    createdAt: atTime(-(i + 2), '10:00'),
  }));
  const list = assigneeId ? pool : pool;
  void assigneeId;
  return ok(list);
}

/* ------------------------------------------------------------------ */
/*  Transport                                                          */
/* ------------------------------------------------------------------ */

function transportRoutes() {
  return [
    { id: 'tr-1', name: 'خط الهرم', areas: 'هرم – فيصل – الطالبية', driverName: 'سعيد رمضان', driverPhone: '+20 100 222 8899', vehicle: 'ميني باص ١٤ راكب', capacity: 14, occupied: 11, pickupTime: '06:50', dropoffTime: '15:10', status: 'ACTIVE', students: [{ id: 'stu-tr1', name: 'عمر محمد' }, { id: 'stu-tr2', name: 'نور محمد' }, { id: 'stu-tr3', name: 'سلمى حسن' }] },
    { id: 'tr-2', name: 'خط المهندسين', areas: 'الدقي – المهندسين', driverName: 'محمد فاروق', driverPhone: '+20 111 333 7788', vehicle: 'كيا سترا باص', capacity: 12, occupied: 9, pickupTime: '07:05', dropoffTime: '15:00', status: 'ACTIVE', students: [{ id: 'stu-tr4', name: 'يوسف وليد' }] },
    { id: 'tr-3', name: 'خط مدينة نصر', areas: 'مدينة نصر – النزهة', driverName: 'عماد النجار', driverPhone: '+20 122 444 5566', vehicle: 'هيونداي ستاريا', capacity: 11, occupied: 6, pickupTime: '07:15', dropoffTime: '15:30', status: 'ACTIVE', students: [] },
    { id: 'tr-4', name: 'خط تجريبي — المعادي', areas: 'المعادي – زهراء المعادي', driverName: null, driverPhone: null, vehicle: null, capacity: 12, occupied: 0, pickupTime: null, dropoffTime: null, status: 'INACTIVE', students: [] },
  ];
}

export function transportSummary() {
  const routes = transportRoutes();
  const active = routes.filter((r) => r.status === 'ACTIVE');
  return ok({ routes: active.length, subscribed: active.reduce((a, r) => a + r.occupied, 0), availableSeats: active.reduce((a, r) => a + (r.capacity - r.occupied), 0), totalSeats: active.reduce((a, r) => a + r.capacity, 0) });
}

export function transportRoutesList() {
  const { items } = paginate(transportRoutes(), 1, 100);
  return ok(items);
}

export function transportStudents() {
  const pool = studentsPool().slice(0, 10).map((s, i) => ({
    id: `sub-${i + 1}`,
    studentId: s.id,
    name: s.fullName,
    phone: s.phone,
    route: i % 3 === 0 ? 'خط الهرم' : i % 3 === 1 ? 'خط المهندسين' : 'خط مدينة نصر',
    joinedAt: '2025-02-01T09:00:00.000Z',
  }));
  const { items } = paginate(pool, 1, 100);
  return ok(items);
}

export function transportDrivers() {
  const { items } = paginate([
    { id: 'dr-1', name: 'سعيد رمضان', driverName: 'سعيد رمضان', driverPhone: '+20 100 222 8899', vehicle: 'ميني باص ١٤ راكب', status: 'ACTIVE' },
    { id: 'dr-2', name: 'محمد فاروق', driverName: 'محمد فاروق', driverPhone: '+20 111 333 7788', vehicle: 'كيا سترا باص', status: 'ACTIVE' },
    { id: 'dr-3', name: 'عماد النجار', driverName: 'عماد النجار', driverPhone: '+20 122 444 5566', vehicle: 'هيونداي ستاريا', status: 'ACTIVE' },
  ], 1, 100);
  return ok(items);
}

/* ------------------------------------------------------------------ */
/*  Payments & finance                                                 */
/* ------------------------------------------------------------------ */

function centerPaymentsPool() {
  const statuses: ('PENDING' | 'PAID' | 'REJECTED' | 'REFUNDED')[] = ['PAID', 'PENDING', 'PAID', 'PAID', 'REJECTED', 'PENDING', 'PAID', 'PAID', 'PENDING', 'PAID', 'PAID', 'PAID', 'PENDING', 'REJECTED', 'PAID', 'PAID', 'PAID', 'PENDING', 'PAID', 'PENDING', 'PAID', 'PAID', 'PAID', 'PENDING'];
  return studentsPool().slice(0, 24).map((s, i) => ({
    id: `cpay-${i + 1}`,
    paymentNumber: `CPAY-2025-${String(5000 + i).padStart(4, '0')}`,
    studentId: s.id,
    studentName: s.fullName,
    amount: (1500 + (i % 8) * 750) * 100,
    status: statuses[i % statuses.length],
    method: ['فودافون كاش', 'انستا باي', 'أورنج كاش', 'كاش'][i % 4],
    reference: i % 2 === 0 ? `TXN${900000 + i}` : null,
    dueDate: daysFromNow((i % 5) - 2),
    paidAt: statuses[i % statuses.length] === 'PAID' ? atTime(-(i % 10), '11:00') : null,
    description: i % 3 === 0 ? 'قسط شهري — مجموعة رياضيات' : i % 3 === 1 ? 'حصة فردية رياضيات' : 'قسط شهري — مجموعة إنجليزي',
    createdAt: atTime(-(i % 14), '10:00'),
  }));
}

export function centerPayments(params: { page?: number; limit?: number; search?: string; status?: string }) {
  let list = centerPaymentsPool();
  if (params.search) list = list.filter((p) => matchesSearch(params.search, p.studentName, p.paymentNumber, p.description ?? ''));
  if (params.status) list = list.filter((p) => p.status === params.status);
  const { items, meta } = paginate(list, params.page ?? 1, params.limit ?? 20);
  return ok(items, meta);
}

export function centerPaymentStats() {
  const pool = centerPaymentsPool();
  const paid = pool.filter((p) => p.status === 'PAID');
  const pending = pool.filter((p) => p.status === 'PENDING');
  const thisMonth = daysFromNow(0).slice(0, 7);
  return ok({
    totalRevenue: paid.reduce((a, p) => a + p.amount, 0),
    pendingAmount: pending.reduce((a, p) => a + p.amount, 0),
    overdueCount: pending.filter((p) => p.dueDate < daysFromNow(0)).length,
    paidThisMonth: paid.filter((p) => (p.paidAt ?? '').startsWith(thisMonth)).length,
  });
}

const EXPENSES = [
  { id: 'exp-1', title: 'إيجار الفرع الرئيسي', category: 'ايجار', amount: 45000, date: '2025-08-01', note: 'إيجار شهري.', },
  { id: 'exp-2', title: 'مرتبات المعلمين — أغسطس', category: 'مرتبات', amount: 128000, date: '2025-08-05', note: 'رواتب شهر أغسطس.', },
  { id: 'exp-3', title: 'شراء سبورات بيضاء', category: 'ادوات وتجهيزات', amount: 8200, date: '2025-08-10', note: 'قاعة ٢ و٣.', },
  { id: 'exp-4', title: 'حبر طابعة + قرطاسية', category: 'نثريات', amount: 1450, date: '2025-08-12', note: null },
  { id: 'exp-5', title: 'صيانة تكييف قاعة ٢', category: 'اخري', amount: 2600, date: '2025-08-15', note: 'فاتورة المصلح.', },
  { id: 'exp-6', title: 'اشتراك الإنترنت', category: 'نثريات', amount: 2200, date: '2025-08-16', note: null },
  { id: 'exp-7', title: 'مكافآت موظفي الاستقبال', category: 'مرتبات', amount: 9500, date: '2025-08-20', note: null },
  { id: 'exp-8', title: 'إضاءة جديدة لساحة الانتظار', category: 'ادوات وتجهيزات', amount: 3100, date: '2025-08-22', note: null },
];

export function financeOverview() {
  return ok({ todayIncome: 12450, totalCollected: 482100, teacherDues: 96500, todayExpenses: 2600, pendingPayments: 11600 });
}

export function financeExpenses(take?: number) {
  const list = take ? EXPENSES.slice(0, take) : EXPENSES;
  return ok(list);
}

export function financeCollections(search?: string) {
  const pool = centerPaymentsPool()
    .filter((p) => p.status === 'PAID')
    .slice(0, 14)
    .map((p, i) => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      studentName: p.studentName,
      teacherName: ['د. أحمد عبد الرحمن', 'أ. مصطفى النجار', 'أ. هاني العشماوي'][i % 3],
      type: i % 2 === 0 ? 'MONTHLY' : 'SESSION',
      method: p.method ?? 'كاش',
      status: 'PAID',
      amount: p.amount / 100,
      centerShare: (p.amount / 100) * 0.35,
      teacherShare: (p.amount / 100) * 0.65,
      paidAt: atTime(-(i % 9), '11:00'),
      lesson: i % 2 === 1 ? { subject: subjName('sub-math'), date: daysFromNow(-(i % 5)) } : null,
    }));
  const list = search ? pool.filter((c) => matchesSearch(search, c.studentName, c.teacherName, c.paymentNumber)) : pool;
  return ok(list);
}

export function financeLedger(search?: string) {
  const pool = studentsPool().slice(0, 12).map((s, i) => ({
    id: s.id,
    name: s.fullName,
    totalPaid: (1100 + (i % 7) * 400) * 100,
    lastPayment: atTime(-(i % 9), '11:00'),
    paymentCount: 3 + (i % 5),
    groupsCount: s.groupCount,
    balance: i % 3 === 0 ? (i % 3 + 1) * 100 : 0,
  }));
  const list = search ? pool.filter((r) => matchesSearch(search, r.name)) : pool;
  return ok(list);
}

export function financeLedgerDetail(studentId: string): { status: number; response: unknown } {
  const s = studentsPool().find((x) => x.id === studentId);
  if (!s) return { status: 404, response: fail('الطالب غير موجود.') };
  return {
    status: 200,
    response: ok({
      id: s.id,
      name: s.fullName,
      phone: s.phone,
      totalPaid: s.totalCollected * 100,
      centerShareTotal: s.totalCollected * 0.35,
      teacherShareTotal: s.totalCollected * 0.65,
      paymentCount: 5,
      groups: s.groups.map((g: { id: string; name: string }) => ({ id: g.id, name: g.name, teacherName: 'د. أحمد عبد الرحمن' })),
      payments: [
        { id: 'ld-1', paymentNumber: 'PAY-2025-1001', amount: 30000, centerShare: 10500, type: 'MONTHLY', method: 'فودافون كاش', status: 'PAID', paidAt: atTime(-10, '11:00'), teacherName: 'د. أحمد عبد الرحمن', lesson: null },
        { id: 'ld-2', paymentNumber: 'PAY-2025-1012', amount: 22000, centerShare: 7700, type: 'SESSION', method: 'انستا باي', status: 'PENDING', paidAt: null, teacherName: 'د. أحمد عبد الرحمن', lesson: { subject: subjName('sub-math'), date: daysFromNow(1) } },
      ],
      attendance: [
        { id: 'ld-att-1', status: 'PRESENT', lesson: daysFromNow(-1), date: daysFromNow(-1), markedAt: atTime(-1, '17:34') },
        { id: 'ld-att-2', status: 'ABSENT', lesson: daysFromNow(-4), date: daysFromNow(-4), markedAt: atTime(-4, '19:00') },
      ],
    }),
  };
}

export function financeSettlementsSummary() {
  return ok({
    counts: { pending: 2, calculated: 3, approved: 2, paid: 6, cancelled: 1, total: 14 },
    totals: { grossAmount: 720000, platformCommission: 7200, teacherShare: 468000, centerShare: 252000, netAmount: 460800 },
  });
}

export function financeSettlements() {
  const teachers = centerTeachersPool().slice(0, 8);
  return ok(
    teachers.map((t, i) => ({
      id: `set-${i + 1}`,
      period: i % 2 === 0 ? '2025-08' : '2025-07',
      status: i === 0 ? 'PENDING' : i === 1 ? 'CALCULATED' : i === 2 ? 'APPROVED' : i === 3 ? 'PAID' : (i === 4 ? 'CANCELLED' : 'CALCULATED'),
      teacherId: t.id,
      grossAmount: 86000 + i * 5200,
      platformCommission: 860 + i * 52,
      teacherShare: (86000 + i * 5200) * 0.65,
      centerShare: (86000 + i * 5200) * 0.35,
      netAmount: (86000 + i * 5200) * 0.65 - (860 + i * 52),
      createdAt: atTime(-(i + 2), '10:00'),
      teacher: { user: { fullName: t.fullName } },
    })),
  );
}

/* ------------------------------------------------------------------ */
/*  Communications + broadcast                                         */
/* ------------------------------------------------------------------ */

export function communicationsSummary() {
  return ok({ employeeMessages: 24, unread: 7, openComplaints: 2, criticalHigh: 2 });
}

function complaintsPool() {
  const base = [
    { id: 'cmp-1', code: 'CMP-101', source: 'PARENT', severity: 'HIGH', score: 82, subject: 'تأخر بداية الحصص عن الموعد', description: 'يبدأ المدرس الحصة بعد عشر دقائق من الموعد المحدد بشكل متكرر.', reporterName: 'محمد عادل', assigneeId: 'emp-1', assignee: 'هاني الخطيب', assigneeRole: 'CENTER_ADMIN', status: 'IN_PROGRESS', internalAssessment: 'يحتاج مناقشة مع المدرسين المعنيين.', internalNotes: 'التأكيد مع مسئول الجدول.\nمتابعة الأسبوع القادم.', resolvedAt: null, createdAt: atTime(-1, '08:30'), updatedAt: atTime(-1, '09:00') },
    { id: 'cmp-2', code: 'CMP-102', source: 'TEACHER', severity: 'MEDIUM', score: null, subject: 'تكييف قاعة ٢ لا يعمل', description: 'درجة الحرارة عالية داخل القاعة.', reporterName: 'أ. مصطفى النجار', assigneeId: null, assignee: null, assigneeRole: null, status: 'OPEN', internalAssessment: null, internalNotes: null, resolvedAt: null, createdAt: atTime(-2, '17:45'), updatedAt: atTime(-2, '17:45') },
    { id: 'cmp-3', code: 'CMP-103', source: 'STUDENT', severity: 'LOW', score: null, subject: 'طلب تغيير موعد حصة', description: 'يتعارض موعد الحصة مع موعد اختبار المدرسة.', reporterName: 'عمر محمد', assigneeId: 'emp-2', assignee: 'سيدة المصري', assigneeRole: 'RECEPTIONIST', status: 'RESOLVED', internalAssessment: 'تم التواصل مع ولي الأمر.', internalNotes: 'تم تعديل الموعد.', resolvedAt: atTime(-1, '13:00'), createdAt: atTime(-4, '11:20'), updatedAt: atTime(-1, '13:05') },
    { id: 'cmp-4', code: 'CMP-104', source: 'EMPLOYEE', severity: 'CRITICAL', score: 95, subject: 'خطأ في كشف الحضور اليومي', description: 'اختلاف بين عدد الحاضرين والسجل الفعلي.', reporterName: 'أميرة رمضان', assigneeId: 'emp-1', assignee: 'هاني الخطيب', assigneeRole: 'CENTER_ADMIN', status: 'IN_PROGRESS', internalAssessment: 'مراجعة بيانات الحضور.', internalNotes: null, resolvedAt: null, createdAt: atTime(0, '07:50'), updatedAt: atTime(0, '08:20') },
    { id: 'cmp-5', code: 'CMP-105', source: 'EXTERNAL', severity: 'MEDIUM', score: null, subject: 'استفسار عن أسعار الاشتراك', description: 'طلب تفاصيل باقات الفصل الدراسي الثاني.', reporterName: 'ولية أمر طالبة', assigneeId: null, assignee: null, assigneeRole: null, status: 'WAITING_CUSTOMER', internalAssessment: null, internalNotes: 'تم الرد عبر الهاتف.', resolvedAt: null, createdAt: atTime(-5, '10:00'), updatedAt: atTime(-4, '12:00') },
  ];
  return base;
}

export function communicationsComplaints(params: { search?: string; severity?: string; status?: string }) {
  let list = complaintsPool();
  if (params.search) list = list.filter((c) => matchesSearch(params.search, c.subject, c.code, c.description ?? '', c.reporterName ?? ''));
  if (params.severity) list = list.filter((c) => c.severity === params.severity);
  if (params.status) list = list.filter((c) => c.status === params.status);
  const { items } = paginate(list, 1, 100);
  return ok(items);
}

export function communicationsMessages() {
  const pool = Array.from({ length: 10 }, (_, i) => ({
    id: `msg-${i + 1}`,
    subject: i % 3 === 0 ? 'استفسار عن مواعيد حصص الرياضيات' : i % 3 === 1 ? 'تأكيد حجز حصة فردية' : 'شكر وتقدير',
    message: i % 2 === 0 ? 'بنت استفسر عن مدى توفر أماكن في مجموعة الرياضيات للصف الثالث الثانوي.' : 'يجب التأكيد على موعد الحصة الفردية غدًا في قاعة ٣.',
    read: i < 5,
    readAt: i < 5 ? atTime(-(i % 3), '12:00') : null,
    sender: i % 2 === 0 ? 'محمد عادل' : 'أ. مصطفى النجار',
    senderRole: i % 2 === 0 ? 'PARENT' : 'TEACHER',
    recipient: 'هاني الخطيب',
    recipientRole: 'CENTER_ADMIN',
    createdAt: atTime(-(i % 6), '09:30'),
  }));
  const { items } = paginate(pool, 1, 100);
  return ok(items);
}

/* ------------------------------------------------------------------ */
/*  Broadcast                                                          */
/* ------------------------------------------------------------------ */

export function broadcastSummary() {
  return ok({ total: 28, sent: 20, scheduled: 4, recipientsToday: 186 });
}

function broadcastsPool() {
  return Array.from({ length: 10 }, (_, i) => ({
    id: `bcast-${i + 1}`,
    audience: i % 4 === 0 ? 'TEACHERS' : i % 4 === 1 ? 'STUDENTS' : i % 4 === 2 ? 'PARENTS' : 'GROUP',
    channel: 'IN_APP',
    subject: i % 3 === 0 ? 'تنبيه: امتحانات الوحدة الأولى' : i % 3 === 1 ? 'مواعيد مراجعات نهاية الأسبوع' : 'استلام الكتب الدراسية',
    message: i % 2 === 0 ? 'نحيطكم علمًا بمواعيد اختبارات الوحدة الأولى خلال الأسبوع القادم. راجعوا الجدول المعلن.' : 'يسر المركز دعوتكم لحضور جلسات المراجعة المجانية يوم الجمعة من الرابعة إلى السادسة.',
    status: i === 0 ? 'SENT' : i === 1 ? 'SCHEDULED' : i === 2 ? 'DRAFT' : i === 3 ? 'CANCELLED' : 'SENT',
    scheduledFor: i === 1 ? atTime(1, '08:00') : null,
    sentAt: i >= 3 ? atTime(-1, '09:00') : (i === 0 ? atTime(0, '08:30') : null),
    recipientCount: 120 + (i % 6) * 10,
    readCount: i >= 3 ? 90 + (i * 5) % 40 : 0,
    groupName: i % 4 === 3 ? 'مجموعة رياضيات تالتة ثانوي' : null,
    createdAt: atTime(-(i + 1), '11:00'),
  }));
}

export function broadcastsList(params: { search?: string; status?: string }) {
  let list = broadcastsPool();
  if (params.search) list = list.filter((b) => matchesSearch(params.search, b.subject, b.message));
  if (params.status) list = list.filter((b) => b.status === params.status);
  const { items } = paginate(list, 1, 100);
  return ok(items);
}

/* ------------------------------------------------------------------ */
/*  Schedule + bookings                                                */
/* ------------------------------------------------------------------ */

export function schedulePage(params: { date?: string; view?: string; branchId?: string }) {
  const date = params.date ?? daysFromNow(0);
  void params.view;
  const lessons = (branchId: string | undefined) => lessonsToday(date).data.filter((l) => (branchId === 'br-1' ? l.branch === 'الفرع الرئيسي — العجوزة' : branchId === 'br-2' ? l.branch === 'فرع المهندسين' : branchId === 'br-3' ? l.branch === 'فرع مدينة نصر' : true));
  return ok(lessons(params.branchId));
}

export function scheduleStats() {
  return ok({ todayLessons: 22, completedLessons: 14, upcomingLessons: 7, cancelledLessons: 1 });
}

export function scheduleFormData() {
  return ok({
    subjects: SUBJECTS.map((s) => ({ id: s.id, name: s.name })),
    teachers: TEACHERS.slice(0, 12).map((t) => ({ id: t.id, userId: `u-${t.id}`, name: t.fullName })),
    rooms: centerClassrooms().data.map((r) => ({ id: r.id, name: r.name, capacity: r.capacity })),
    branches: branchesBrief().data.map((b) => ({ id: b.id, name: b.name })),
  });
}

export function bookingsSchedule(params: { date?: string; branchId?: string }) {
  const base = centerDashboard(params.branchId).data as { rooms: { id: string; name: string; status: string; lessons: { id: string; teacher: string; subject: string; grade: string; startTime: string; endTime: string; status: string }[] }[] };
  return ok({
    date: params.date ?? daysFromNow(0),
    rooms: base.rooms.map((r) => ({
      id: r.id,
      name: r.name,
      capacity: 24,
      status: r.status,
      availableUntil: null,
      ongoingUntil: r.status === 'IN_PROGRESS' ? r.lessons?.[0]?.endTime ?? null : null,
      bookingsCount: r.lessons.length,
      branch: null,
      occurrences: r.lessons.map((l) => ({
        id: l.id,
        roomId: r.id,
        teacherId: 't-01',
        teacher: l.teacher,
        subject: l.subject,
        grade: l.grade,
        note: null,
        startTime: l.startTime,
        endTime: l.endTime,
        recurrence: 'ONE_TIME',
        status: l.status === 'IN_PROGRESS' ? 'APPROVED' : l.status === 'PENDING' ? 'PENDING' : 'APPROVED',
        timelineStatus: l.status,
      })),
    })),
    queue: [
      { id: 'q-1', roomId: 'r-03', room: 'قاعة ٣', teacherId: 't-16', teacher: 'د. شيماء عبد الله', subject: 'الفيزياء', note: null, date: null, dayOfWeek: 4, startTime: '18:30', endTime: '20:00', recurrence: 'WEEKLY', createdAt: atTime(-1, '09:00') },
      { id: 'q-2', roomId: 'r-05', room: 'قاعة ٥', teacherId: 't-15', teacher: 'أ. مصطفى النجار', subject: 'الإحصاء', note: 'مجموعة مسائية.', date: daysFromNow(3), dayOfWeek: null, startTime: '19:00', endTime: '20:30', recurrence: 'ONE_TIME', createdAt: atTime(-2, '15:00') },
    ],
  });
}

/* ------------------------------------------------------------------ */
/*  Attendance (center)                                                */
/* ------------------------------------------------------------------ */

function centerAttendanceRows() {
  const statuses: AttendanceStatus[] = ['PRESENT', 'PRESENT', 'LATE', 'ABSENT', 'PRESENT', 'EXCUSED', 'PRESENT', 'ABSENT', 'PRESENT', 'LATE'];
  return studentsPool().slice(0, 10).map((s, i) => ({
    id: `catt-${i + 1}`,
    studentId: s.id,
    studentName: s.fullName,
    studentPhoto: null,
    lessonId: s.groups[0]?.groupId ?? 'g-g1s-math',
    lessonName: s.groups[0]?.name ?? 'مجموعة', 
    status: statuses[i % statuses.length],
    markedAt: atTime(0, `1${7 - (i % 3)}:35`),
    notes: statuses[i % statuses.length] === 'ABSENT' ? 'عذر من ولي الأمر لاحقًا.' : null,
  }));
}

export function centerAttendance(date?: string) {
  void date;
  const { items } = paginate(centerAttendanceRows(), 1, 100);
  return ok(items);
}

export function centerAttendanceStats(date?: string) {
  void date;
  return ok({ total: 144, present: 118, absent: 14, late: 9, excused: 3 });
}

/* ------------------------------------------------------------------ */
/*  Analytics                                                          */
/* ------------------------------------------------------------------ */

export function centerAnalytics(_period?: string) {
  return ok({
    studentsTrend: 12,
    teachersTrend: 8,
    revenueTrend: 21,
    lessonsTrend: 9,
    topSubjects: [
      { name: 'الرياضيات', count: 84 },
      { name: 'اللغة العربية', count: 61 },
      { name: 'الفيزياء', count: 48 },
      { name: 'الكيمياء', count: 42 },
      { name: 'اللغة الإنجليزية', count: 37 },
    ],
  });
}

/* ------------------------------------------------------------------ */
/*  Reports                                                            */
/* ------------------------------------------------------------------ */

export function centerReports(params: { period?: string; compare?: string; branchId?: string }) {
  const period = params.period ?? 'month';
  const compare = params.compare ?? 'lastMonth';
  void compare;
  const months = ['-"2025-01"', '"2025-02"', '"2025-03"', '"2025-04"', '"2025-05"', '"2025-06"'];
  return ok({
    period,
    compare,
    branchId: params.branchId ?? null,
    stats: { occupancyRate: 78, netIncome: 412800, collected: 482100, openComplaints: 2, highCriticalComplaints: 1 },
    operations: {
      monthly: months.map((key, i) => ({ key: key.replaceAll('"', ''), rate: 62 + i * 6 - (i === 3 ? 14 : 0) })),
      bookings: [{ key: 'group', count: 58, pct: 62 }, { key: 'session', count: 36, pct: 38 }],
    },
    financial: {
      monthly: months.map((key, i) => ({ key: key.replaceAll('"', ''), net: 190000 + i * 24000 })),
      composition: [{ key: 'tuition', value: 68 }, { key: 'sessions', value: 22 }, { key: 'other', value: 10 }],
    },
    people: {
      teachers: centerTeachersPool().slice(0, 8).map((t, i) => ({ id: t.id, name: t.fullName, subject: subjName(t.subjects[0]), groups: t.groupCount, bookings: 4 + (i % 6) })),
      students: studentsPool().slice(0, 10).map((s) => ({ id: s.id, name: s.fullName, code: s.studentNumber ?? '', groups: s.groupCount, status: s.enrollmentStatus })),
    },
    complaints: {
      bySeverity: [{ key: 'CRITICAL', count: 1 }, { key: 'HIGH', count: 1 }, { key: 'MEDIUM', count: 2 }, { key: 'LOW', count: 1 }],
      sla: [
        { id: 'cmp-1', subject: 'تأخر بداية الحصص عن الموعد', severity: 'HIGH', elapsedMinutes: 95, targetMinutes: 120, within: true },
        { id: 'cmp-4', subject: 'خطأ في كشف الحضور اليومي', severity: 'CRITICAL', elapsedMinutes: 160, targetMinutes: 60, within: false },
      ],
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Profile + settings + audit                                         */
/* ------------------------------------------------------------------ */

export function centerProfile() {
  return ok({
    id: 'c-nile',
    name: 'مركز النيل للتعليم',
    nameEn: 'Nile Education Center',
    slug: 'nile-education-center',
    description: 'مركز تعليمي متكامل يضم نخبة من المدرسين، وبرامج مراجعة مكثفة لطلاب الثانوية العامة.',
    shortDescription: 'تميز وأمانة في التعليم منذ ٢٠١٩.',
    published: true,
    logoUrl: null,
    coverUrl: null,
    phone: '+20 100 101 0203',
    email: 'info@nile-education.eg',
    website: null,
    city: 'الجيزة',
    address: 'شارع سعيد ثابت، العجوزة',
    latitude: 30.0529,
    longitude: 31.2112,
    facebook: null,
    instagram: null,
    youtube: null,
    linkedin: null,
    whatsapp: '+20 100 101 0203',
    workingHoursText: 'السبت – الخميس من ٩ صباحًا حتى ١٠ مساءً',
    equipment: ['سبورات بيضاء', 'شاشات عرض', 'تكييف مركزي', 'واي فاي'],
    photos: [],
    status: 'ACTIVE',
    subscriptionStatus: 'ACTIVE',
    stats: { totalRooms: 12 },
  });
}

const NAV_ORDER = ['dashboard', 'rooms', 'teachers', 'groups', 'students', 'employees', 'finance', 'transport', 'communications', 'broadcast', 'reports', 'profile', 'settings'];

export function centerSettings() {
  return ok({
    navOrder: NAV_ORDER,
    hiddenPages: [],
    escalation: { highAfter: '2h', normalAfter: '24h', complaintResolveAfter: '4d' },
    comparisonMode: 'LAST_MONTH',
    auditRecentCount: 50,
  });
}

const AUDIT_ACTIONS = [
  { action: 'updated_schedule', category: 'OPERATIONS', target: 'جدول الفرع الرئيسي', details: 'تعديل موعد حصة رياضيات تالتة ثانوي.' },
  { action: 'updated_payment', category: 'FINANCE', target: 'مدفوعات', details: 'تحديث حالة الدفع إلى مدفوع.' },
  { action: 'created_teacher', category: 'OPERATIONS', target: 'معلم', details: 'إضافة حساب معلم جديد.' },
  { action: 'sent_broadcast', category: 'COMMUNICATION', target: 'إشعار جماعي', details: 'إرسال تنبيه بأشياء الدرجة.' },
  { action: 'login', category: 'SECURITY', target: 'جلسة', details: 'تسجيل دخول ناجح.' },
  { action: 'updated_settings', category: 'SETTINGS', target: 'إعدادات', details: 'تغيير مجمل المقارنة إلى نفس الشهر من العام السابق.' },
];

export function centerAuditLog(params: { q?: string; category?: string; result?: string; page?: number; limit?: number }) {
  const pool = Array.from({ length: 46 }, (_, i) => {
    const a = AUDIT_ACTIONS[i % AUDIT_ACTIONS.length];
    return {
      id: `audit-${i + 1}`,
      time: atTime(-Math.floor(i / 2), '09:10'),
      action: a.action,
      category: a.category,
      target: a.target,
      entityId: `e-${1000 + i}`,
      details: a.details,
      actorName: ['هاني الخطيب', 'أميرة رمضان', 'النظام'][i % 3],
      actorRole: i % 3 === 1 ? 'RECEPTIONIST' : 'CENTER_ADMIN',
      result: i % 9 === 0 ? 'DENIED' : i % 13 === 0 ? 'WARNING' : 'SUCCESS',
    };
  });
  let list = pool;
  if (params.q) list = list.filter((r) => matchesSearch(params.q, r.details, r.target, r.actorName));
  if (params.category && params.category !== 'ALL') list = list.filter((r) => r.category === params.category);
  if (params.result && params.result !== 'ALL') list = list.filter((r) => r.result === params.result);
  const { items, meta } = paginate(list, params.page ?? 1, params.limit ?? 15);
  return ok(items, meta);
}

/* ------------------------------------------------------------------ */
/*  Default 204-style success for demo writes                          */
/* ------------------------------------------------------------------ */

export function demoSuccess(data: unknown = {}) {
  return ok(data);
}

export function demoLocName(id: string): string {
  return locName(id);
}

export function demoSubjName(id: string): string {
  return subjName(id);
}