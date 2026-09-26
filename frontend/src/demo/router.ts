import type { ApiResponse } from '../lib/api';
import { SUBJECTS, GRADES, LOCATIONS, CENTERS, TEACHERS, teacherById, centerById, centerTeachersFor, SPACES, CENTER_PACKAGES } from './catalog';
import {
  authMockInfo,
  authLogin,
  authMe,
  authRefresh,
  authLogout,
  demoUserByUsername,
} from './users';
import { ok, fail, parseQuery, paginate, matchesSearch } from './helpers';
import {
  lessonsForStudent,
  studentDashboardChild,
  teacherStats,
  teacherStudents,
  myTeachers,
  studentFollowedCenters,
  checkFollow,
  parentsChildren,
  parentsDashboard,
  childDashboard,
  parentsChildrenPost,
  attendanceSummary,
  studentAttendanceRecords,
  parentAttendanceOverview,
  examsForStudent,
  assignmentsForStudent,
  teacherAssignments,
  notifications,
  paymentsMine,
  teacherPaymentSettings,
  adminPaymentSummary,
  adminStats,
  adminUsers,
  adminTeachers,
  adminLogs,
  adminAnalytics,
  adminReports,
  availableSlotsForDate,
} from './dashboards';
import {
  branchesBrief,
  branchesFull,
  centerDashboard,
  centerStats,
  centerClassrooms,
  centerStudents,
  centerStudentsFormData,
  centerStudentDetail,
  studentCommunications,
  centerStudentsStats,
  centerTeachersAll,
  centerTeachersQueue,
  centerTeacherDetail,
  centerGroupsSummary,
  centerGroups,
  groupsFormData,
  centerGroupDetail,
  centerStaff,
  centerStaffStats,
  centerPermissionMatrix,
  centerEmployeesList,
  centerEmployeeDetail,
  centerTasks,
  transportSummary,
  transportRoutesList,
  transportStudents,
  transportDrivers,
  centerPayments,
  centerPaymentStats,
  financeOverview,
  financeExpenses,
  financeCollections,
  financeLedger,
  financeLedgerDetail,
  financeSettlementsSummary,
  financeSettlements,
  communicationsSummary,
  communicationsComplaints,
  communicationsMessages,
  broadcastSummary,
  broadcastsList,
  schedulePage,
  scheduleStats,
  scheduleFormData,
  bookingsSchedule,
  centerAttendance,
  centerAttendanceStats,
  centerAnalytics,
  centerReports,
  centerProfile,
  centerSettings,
  centerAuditLog,
  demoSuccess,
} from './center';

export interface DemoRespondResult {
  status: number;
  body: unknown;
}

/**
 * Resolves a demo response for a (possibly query-carrying) path, or null when
 * the request is not covered by the demo layer (the real API then runs).
 */
export function demoRespond(rawPath: string, method: string, body?: unknown): DemoRespondResult | null {
  const [pathOnly, queryStr] = rawPath.split('?');
  const q = parseQuery(queryStr || '');
  const segs = pathOnly.split('/').filter(Boolean).map(decodeURIComponent);
  const m = method.toUpperCase();
  const num = (v: string | undefined, fallback: number) => (v ? Number(v) || fallback : fallback);

  /* ------------------------------------------------------------------ */
  /*  Auth                                                               */
  /* ------------------------------------------------------------------ */
  if (segs[0] === 'auth') {
    if (segs[1] === 'mock-info' && m === 'GET') return out(authMockInfo());
    if (segs[1] === 'login' && m === 'POST') return out(authLogin(body));
    if (segs[1] === 'me' && m === 'GET') return out(authMe());
    if (segs[1] === 'refresh' && m === 'POST') return out(authRefresh());
    if (segs[1] === 'logout' && m === 'POST') return out(authLogout());
    if (segs[1] === 'register' && m === 'POST') {
      const u = demoUserByUsername(segs[2] === 'teacher' ? 'demo.teacher.1' : segs[2] === 'student' ? 'demo.student.1' : 'demo.parent.1');
      return {
        status: 200,
        body: ok(u ?? { id: 'u-reg-1', username: 'pending', fullName: 'مستخدم جديد', phone: null, photo: null, email: null, role: 'STUDENT', status: 'INACTIVE', createdAt: new Date().toISOString() }),
      };
    }
    if (segs[1] === 'otp' && m === 'POST') {
      if (segs[2] === 'request') return out(demoOtp());
      if (segs[2] === 'verify') {
        return {
          status: 200,
          body: ok({ purpose: 'RESET_PASSWORD', role: null, loggedIn: false }),
        };
      }
      if (segs[2] === 'resend') return out(demoOtp());
    }
    if (segs[1] === 'forgot-password' && m === 'POST') {
      if (segs[2] === 'phone') return out(demoOtp());
      if (segs[2] === 'verify') return { status: 200, body: ok({ resetToken: 'demo-reset-token', expiresAt: new Date(Date.now() + 600_000).toISOString(), maskedPhone: '+20 **** 555 0101' }) };
      if (segs[2] === 'resend') return out(demoOtp());
    }
    if (segs[1] === 'reset-password' && m === 'POST') return out(demoSuccess());
    return null;
  }

  /* ------------------------------------------------------------------ */
  /*  Catalog reference data (client + SSR)                              */
  /* ------------------------------------------------------------------ */
  if (segs[0] === 'catalog') {
    const { kind, id } = segs[1] ? { kind: segs[1], id: segs[2] } : { kind: '', id: undefined };
    const all = kind === 'subjects' ? SUBJECTS : kind === 'grades' ? GRADES : kind === 'locations' ? LOCATIONS : null;
    if (!all) return null;
    if (m === 'GET' && !id) return out(ok(all));
    if (m === 'GET' && id) return out(ok(all.find((x: { id: string }) => x.id === id) ?? fail('غير موجود.')));
    if (m === 'POST' || m === 'PUT' || m === 'DELETE') return out(demoSuccess());
    return null;
  }

  /* ------------------------------------------------------------------ */
  /*  Admin catalog (CatalogManager uses /admin/{subjects|grades|locations}) */
  /* ------------------------------------------------------------------ */
  if (segs[0] === 'subjects' && m === 'GET') return out(ok(SUBJECTS));
  if (segs[0] === 'admin' && segs[1] === 'subjects') return catalogCrud(segs, m);
  if (segs[0] === 'admin' && segs[1] === 'grades') return catalogCrud(segs, m, GRADES);
  if (segs[0] === 'admin' && segs[1] === 'locations') return catalogCrud(segs, m, LOCATIONS);

  /* ------------------------------------------------------------------ */
  /*  Public teachers                                                    */
  /* ------------------------------------------------------------------ */
  if (segs[0] === 'teachers') {
    if (!segs[1] && m === 'GET') return out(searchTeachers(q));
    if (segs[1] === 'me') {
      if (segs[2] === 'stats' && m === 'GET') return out(ok(teacherStats()));
      if (segs[2] === 'students' && m === 'GET') return out(teacherStudentsPage(q));
      if (segs[2] === 'profile' && (m === 'PUT' || m === 'POST')) return out(demoSuccess());
      if (segs[2] === 'photo' && (m === 'PUT' || m === 'POST')) return out(demoSuccess());
      if (segs[2] === 'availability' && m === 'PUT') return out(demoSuccess());
      return null;
    }
    if (segs[1] && m === 'GET' && segs[2] === 'available-slots') {
      return out(ok(availableSlotsForDate(segs[1], q.from ?? q.to)));
    }
    if (segs[1] && segs[1] !== 'me' && m === 'GET') {
      const t = teacherById(segs[1]);
      if (!t) return { status: 404, body: fail('المدرس غير موجود.') };
      const { reviews, total } = reviewsForPublic(t);
      return out(
        ok({
          ...t,
          _centerId: undefined,
          studentCount: 12 + (t.ratingCount % 7),
          completedLessons: 40 + ((t.ratingCount * 2) % 300),
          isEnrolled: myTeachers().some((mt) => mt.id === t.id),
          myLessonsCount: myTeachers().some((mt) => mt.id === t.id) ? 18 : undefined,
          reviews,
          reviewsTotal: total,
        }),
      );
    }
    return null;
  }
  if (segs[0] === 'ratings' && segs[1] && m === 'POST') {
    const t = teacherById(segs[1]);
    if (!t) return { status: 404, body: fail('المدرس غير موجود.') };
    return out(ok({}));
  }

  /* ------------------------------------------------------------------ */
  /*  Public centers                                                     */
  /* ------------------------------------------------------------------ */
  if (segs[0] === 'centers') {
    if (segs[1] === 'search' && m === 'GET') return out(searchCenters(q));
    if (segs[1] === 'register' && m === 'POST') return out(demoSuccess());
    if (segs[1] && segs[2] === 'teachers' && m === 'GET') {
      const c = centerById(segs[1]);
      return out(ok(c ? centerTeachersFor(c.id) : []));
    }
    if (segs[1] && segs[2] === 'rating' && segs[3] === 'me' && m === 'GET') return out(ok(null));
    if (segs[1] && segs[2] === 'rating' && m === 'GET') {
      const c = centerById(segs[1]);
      if (!c) return { status: 404, body: fail('المركز غير موجود.') };
      return out(ok({ average: c.ratingAverage ?? 0, total: c.ratingCount ?? 0, distribution: ratingBars(c.ratingCount ?? 0) }));
    }
    if (segs[1] && segs[2] === 'rating' && m === 'POST') return out(ok({}));
    if (segs[1] && m === 'GET') {
      const c = centerById(segs[1]);
      if (!c) return { status: 404, body: fail('المركز غير موجود.') };
      return out(ok(c));
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /*  Public co-spaces + subscription plans                              */
  /* ------------------------------------------------------------------ */
  if (segs[0] === 'spaces' && segs[1] === 'search' && m === 'GET') return out(searchSpaces(q));
  if (segs[0] === 'subscriptions' && segs[1] === 'public' && segs[2] === 'center-plans' && m === 'GET') return out(ok(CENTER_PACKAGES));

  /* ------------------------------------------------------------------ */
  /*  Student follows                                                    */
  /* ------------------------------------------------------------------ */
  if (segs[0] === 'students' && segs[1] === 'follows') {
    if (m === 'GET' && !segs[2]) return out(ok(studentFollowedCenters()));
    if (m === 'GET' && segs[2]) return out(checkFollow(segs[2]));
    if ((m === 'POST' || m === 'DELETE') && segs[2]) return out(ok({ followed: m === 'POST' }));
    return out(ok(demoSuccess()));
  }

  /* ------------------------------------------------------------------ */
  /*  Student area                                                       */
  /* ------------------------------------------------------------------ */
  if (segs[0] === 'students' && segs[1] === 'dashboard' && m === 'GET') return out(ok(studentDashboardChild('stu-1')));
  if (segs[0] === 'students' && segs[1] === 'me') {
    if (segs[2] === 'teachers' && m === 'GET') return out(ok(myTeachers()));
    if (segs[2] === 'profile' && m === 'PUT') return out(demoSuccess());
    if (segs[2] === 'photo' && (m === 'PUT' || m === 'POST')) return out(demoSuccess());
    return out(demoSuccess());
  }

  /* ------------------------------------------------------------------ */
  /*  Lessons                                                            */
  /* ------------------------------------------------------------------ */
  if (segs[0] === 'lessons') {
    if (!segs[1] && m === 'GET') return out(lessonsForStudent({ date: q.date, status: q.status, page: num(q.page, 1), limit: num(q.limit, 20) }));
    if (!segs[1] && m === 'POST') return out(demoSuccess());
    if (segs[1] && segs[2] === 'book' && m === 'POST') return out(ok({ id: 'bk-demo-1' }));
    if (segs[1] && segs[2] === 'attendance' && (m === 'GET' || m === 'POST')) return out(ok([]));
    if (segs[1] && segs[2] === 'attendance' && segs[3] === 'student' && m === 'GET') return out(studentAttendanceRecords(segs[3], num(q.page, 1), num(q.limit, 20)));
    if (segs[1] && m === 'GET') return out(lessonsForStudent({}));
    if (segs[1] && m === 'PUT') return out(demoSuccess());
    return null;
  }

  /* ------------------------------------------------------------------ */
  /*  Exams                                                              */
  /* ------------------------------------------------------------------ */
  if (segs[0] === 'exams') {
    if (!segs[1] && m === 'GET') return out(examsForStudent('stu-1', num(q.page, 1), num(q.limit, 20), q.status));
    if (!segs[1] && m === 'POST') return out(demoSuccess());
    if (segs[1] && segs[2] === 'start' && m === 'POST') {
      const attempt = demoAttempt(segs[1]);
      return out(ok({ attempt }));
    }
    if (segs[1] && segs[2] === 'results' && m === 'GET') return out(ok(demoExamResults(segs[1])));
    if (segs[1] && !segs[2] && m === 'GET') {
      const exam = demoExam(segs[1]);
      if (!exam) return { status: 404, body: fail('الاختبار غير موجود.') };
      return out(ok(exam));
    }
    if (segs[1] && !segs[2] && (m === 'PUT' || m === 'DELETE')) return out(demoSuccess());
    if (segs[1] === 'attempts' && segs[2]) {
      if (m === 'GET') return out(ok(demoAttemptResult(segs[2])));
      if (segs[3] === 'submit' && m === 'POST') return out(ok({ attempt: { id: segs[2] } }));
      if (segs[3] === 'answers' && segs[4] && m === 'POST') return out(ok({}));
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /*  Assignments                                                        */
  /* ------------------------------------------------------------------ */
  if (segs[0] === 'assignments') {
    if (!segs[1] && m === 'GET') return out(teacherAssignments(num(q.page, 1), num(q.limit, 20)));
    if (!segs[1] && (m === 'POST' || m === 'POST_FORM')) return out(demoSuccess());
    if (segs[1] === 'submissions' && segs[2] && m === 'PUT' && segs[3] === 'grade') return out(demoSuccess());
    if (segs[1] && segs[2] === 'submissions' && m === 'GET') return out(ok(demoSubmissions(segs[1])));
    if (segs[1] === 'students' && segs[2] && m === 'GET') return out(assignmentsForStudent(segs[2], num(q.page, 1), num(q.limit, 20)));
    if (segs[1] && segs[2] === 'submit' && m === 'POST') return out(ok({}));
    if (segs[1] && !segs[2]) {
      if (m === 'GET') return out(ok(demoAssignment(segs[1])));
      if (m === 'PUT' || m === 'DELETE') return out(demoSuccess());
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /*  Attendance (student, teacher, admin)                               */
  /* ------------------------------------------------------------------ */
  if (segs[0] === 'attendance') {
    if (segs[1] === 'lesson' && segs[2] && m === 'GET') return out(ok(demoLessonAttendance(segs[2])));
    if (segs[1] === 'lesson' && segs[2] && segs[3] === 'finalize' && m === 'POST') return out(demoSuccess());
    if (segs[1] === 'summary' && segs[2] && m === 'GET') return out(attendanceSummary(segs[2]));
    if (segs[1] === 'parent' && segs[2] === 'overview' && m === 'GET') return out(ok(parentAttendanceOverview()));
    if (segs[1] === 'settings') {
      if (m === 'GET') return out(ok(centerSettingsData()));
      if (m === 'PUT' || m === 'POST') return out(demoSuccess());
    }
    if (segs[1] && m === 'PUT') return out(demoSuccess());
    return null;
  }

  /* ------------------------------------------------------------------ */
  /*  Parents                                                            */
  /* ------------------------------------------------------------------ */
  if (segs[0] === 'parents') {
    if (segs[1] === 'dashboard' && m === 'GET') return out(ok(parentsDashboard()));
    if (segs[1] === 'children') {
      if (m === 'GET') return out(ok(parentsChildren()));
      if (m === 'POST') return out(parentsChildrenPost(body));
      if (segs[2] && m === 'GET') {
        if (segs[3] === 'dashboard') return out(ok(childDashboard(segs[2])));
        if (segs[3] === 'lessons') return out(lessonsForStudent({}));
        if (segs[3] === 'exams') return out(examsForStudent(segs[2], num(q.page, 1), num(q.limit, 20)));
        if (segs[3] === 'assignments') return out(assignmentsForStudent(segs[2], num(q.page, 1), num(q.limit, 20)));
        if (segs[3] === 'attendance' && m === 'GET') return out(ok(parentAttendanceOverview()));
        return out(demoSuccess());
      }
      if (segs[2] && m === 'POST') return out(ok({}));
    }
    if (segs[1] === 'profile' && m === 'PUT') return out(demoSuccess());
    if (segs[1] === 'photo' && (m === 'PUT' || m === 'POST')) return out(demoSuccess());
    return null;
  }

  /* ------------------------------------------------------------------ */
  /*  Payments                                                           */
  /* ------------------------------------------------------------------ */
  if (segs[0] === 'payments') {
    if (segs[1] === 'mine' && m === 'GET') return out(paymentsMine(num(q.page, 1), num(q.limit, 20)));
    if (segs[1] === 'teacher') {
      if (segs[2] === 'settings' && m === 'GET') return out(ok(teacherPaymentSettings()));
      if (segs[2] === 'settings' && m === 'PUT') return out(demoSuccess());
      if (m === 'GET') return out(paymentsMine(num(q.page, 1), num(q.limit, 20)));
    }
    if (segs[1] === 'admin' && segs[2] === 'summary' && m === 'GET') return out(ok(adminPaymentSummary()));
    if (segs[1] && m === 'POST') {
      if (segs[2] === 'approve' || segs[2] === 'reject' || segs[2] === 'refund') return out(demoSuccess());
    }
    if (segs[1] && m === 'GET') return out(paymentsMine(num(q.page, 1), num(q.limit, 20)));
    if (m === 'POST') return out(demoSuccess());
    return null;
  }

  /* ------------------------------------------------------------------ */
  /*  Notifications                                                      */
  /* ------------------------------------------------------------------ */
  if (segs[0] === 'notifications') {
    if (m === 'GET') return out(notifications(num(q.page, 1), num(q.limit, 20)));
    if (segs[1] === 'read-all' && m === 'PUT') return out(demoSuccess());
    if (segs[1] && segs[2] === 'read' && m === 'PUT') return out(demoSuccess());
    return null;
  }

  /* ------------------------------------------------------------------ */
  /*  Super admin                                                        */
  /* ------------------------------------------------------------------ */
  if (segs[0] === 'admin') {
    if (segs[1] === 'stats' && m === 'GET') return out(ok(adminStats()));
    if (segs[1] === 'users') {
      if (segs[2] && segs[3] === 'status' && m === 'PUT') return out(demoSuccess());
      if (segs[2] && m === 'PUT') return out(demoSuccess());
      if (m === 'GET') return out(adminUsers({ role: q.role, status: q.status, search: q.search, page: num(q.page, 1), limit: num(q.limit, 20) }));
      if (m === 'POST') return out(demoSuccess());
    }
    if (segs[1] === 'teachers' && m === 'GET') return out(adminTeachers({ search: q.search, page: num(q.page, 1), limit: num(q.limit, 20) }));
    if (segs[1] === 'logs' && m === 'GET') return out(adminLogs(num(q.page, 1), 50));
    if (segs[1] === 'analytics' && m === 'GET') return out(ok(adminAnalytics()));
    if (segs[1] === 'reports' && segs[2] && m === 'GET') return out(adminReports(segs[2]));
    if (segs[1] === 'centers') {
      if (segs[2] && segs[3]) {
        if (['approve', 'reject', 'suspend', 'activate'].includes(segs[3]) && m === 'PATCH') return out(demoSuccess());
        return null;
      }
      if (segs[2] && m === 'GET') return out(ok(adminCenterDetail(segs[2])));
      if (m === 'GET') return out(adminCentersList(q));
    }
    if (segs[1] === 'payments' && m === 'GET') return out(ok(adminPaymentSummary()));
    return null;
  }

  /* ------------------------------------------------------------------ */
  /*  Center admin                                                       */
  /* ------------------------------------------------------------------ */
  return centerDispatch(segs, m, q, body);
}

/* ====================================================================== */
/*  Helpers                                                               */
/* ====================================================================== */

function out(r: unknown): DemoRespondResult {
  if (
    r &&
    typeof r === 'object' &&
    'status' in r &&
    typeof (r as { status: unknown }).status === 'number' &&
    'response' in r
  ) {
    const rr = r as { status: number; response: unknown };
    return { status: rr.status, body: rr.response };
  }
  return { status: 200, body: r };
}

function demoOtp() {
  return ok({
    verificationId: 'demo-verif-1',
    maskedPhone: '+20 **** 555 0101',
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    resendCooldown: 60,
    devOtp: '123456',
  });
}

function searchTeachers(q: Record<string, string>) {
  let list = TEACHERS;
  if (q.name) list = list.filter((t) => matchesSearch(q.name, t.fullName, t.bio ?? ''));
  if (q.subjectId) list = list.filter((t) => t.subjects.some((s) => s.id === q.subjectId));
  if (q.centerId) list = list.filter((t) => t._centerId === q.centerId);
  if (q.grades) {
    const ids = q.grades.split(',');
    list = list.filter((t) => t.grades.some((g) => ids.includes(g.id)));
  }
  if (q.locationId) list = list.filter((t) => t.location?.id === q.locationId);
  if (q.day !== undefined && q.day !== '') list = list.filter((t) => t.availability.some((a) => a.day === Number(q.day)));
  if (q.maxPrice) list = list.filter((t) => t.hourlyRate <= Number(q.maxPrice));
  if (q.minRating) list = list.filter((t) => t.rating >= Number(q.minRating));
  const cleaned = list.map(({ _centerId: _c, ...rest }) => rest);
  const { items, meta } = paginate(cleaned, Number(q.page) || 1, Number(q.limit) || 12);
  return ok(items, meta);
}

function searchCenters(q: Record<string, string>) {
  let list = CENTERS;
  if (q.q) list = list.filter((c) => matchesSearch(q.q, c.name, c.nameEn ?? '', c.address ?? ''));
  if (q.city) list = list.filter((c) => matchesSearch(q.city, c.city ?? ''));
  const { items, meta } = paginate(list, Number(q.page) || 1, Number(q.limit) || 12);
  return ok({ items, total: meta.total, page: meta.page, limit: meta.limit, totalPages: meta.totalPages }, filledMeta(meta));
}

function searchSpaces(q: Record<string, string>) {
  let list = SPACES;
  if (q.q) list = list.filter((s) => matchesSearch(q.q, s.name, s.nameEn ?? '', s.governorate ?? '', s.area ?? ''));
  if (q.governorate) list = list.filter((s) => s.governorate === q.governorate);
  const { items, meta } = paginate(list, Number(q.page) || 1, Number(q.limit) || 12);
  return ok({ items, total: meta.total, page: meta.page, limit: meta.limit, totalPages: meta.totalPages }, filledMeta(meta));
}

function filledMeta(meta: { page: number; limit: number; total: number; totalPages: number }) {
  return meta;
}

function ratingBars(count: number) {
  const base = [70, 18, 8, 3, 1];
  const factor = count / 100;
  return base.map((p, i) => ({ stars: 5 - i, count: Math.max(1, Math.round(p * factor + 1)) }));
}

function teacherStudentsPage(q: Record<string, string>) {
  const list = teacherStudents();
  const filtered = q.search ? list.filter((s) => matchesSearch(q.search, s.fullName, String(s.grade?.id ?? ''))) : list;
  const { items } = paginate(filtered, Number(q.page) || 1, Number(q.limit) || 20);
  return ok(items);
}

function catalogCrud(segs: string[], m: string, pool?: { id: string }[]) {
  const all = segs[1] === 'subjects' ? SUBJECTS : pool;
  if (m === 'GET') return out(ok(all!));
  if (m === 'POST') return out(demoSuccess());
  if (m === 'PUT' && segs[2]) return out(demoSuccess());
  if (m === 'DELETE' && segs[2]) return out(demoSuccess());
  return null;
}

function adminCenterDetail(id: string) {
  const c = centerById(id) ?? CENTERS[0];
  return {
    center: { ...c, status: 'ACTIVE' },
    admin: null,
    statistics: {
      totalTeachers: c.teacherCount,
      totalStudents: c.studentCount,
      totalLessons: c.studentCount * 3,
      totalRevenue: c.studentCount * 1200,
      approvalRate: 0.94,
    },
  };
}

function adminCentersList(q: Record<string, string>) {
  let list = CENTERS.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.id === 'c-nile' ? 'ACTIVE' : c.id === 'c-herth' ? 'PENDING' : 'ACTIVE',
    subscriptionStatus: c.id === 'c-nile' ? 'ACTIVE' : 'TRIAL',
    adminName: 'هاني الخطيب',
    city: c.city ?? 'القاهرة',
    createdAt: '2024-03-05T09:00:00.000Z',
    teacherCount: c.teacherCount,
    studentCount: c.studentCount,
  }));
  if (q.status) list = list.filter((c) => c.status === q.status);
  if (q.q) list = list.filter((c) => matchesSearch(q.q, c.name, c.city));
  const { items, meta } = paginate(list, Number(q.page) || 1, Number(q.limit) || 20);
  return ok(items, meta);
}

/* ------------------------------------------------------------------ */
/*  Exams                                                              */
/* ------------------------------------------------------------------ */

interface QuestionSeed {
  q: string;
  options: string[];
  correctIndex: number;
  points: number;
}

function questionsFor(examId: string): QuestionSeed[] {
  if (examId === 'ex-02') {
    return [
      { q: 'ما إعراب كلمة "المجدُ" في جملة "المجدُ عالٍ"؟', options: ['مبتدأ مرفوع', 'فاعل مرفوع', 'مفعول به منصوب', 'خبر مرفوع'], correctIndex: 0, points: 4 },
      { q: '"أكرمُ الناسِ من يُكرمُ ضيفه" نوع المشتقات في الجملة؟', options: ['اسم فاعل فقط', 'اسم مفعول', 'صفة مشبهة', 'مصدر'], correctIndex: 0, points: 4 },
      { q: 'ما جمع كلمة "مصطفىField"؟', options: ['مصطفيون', 'مصطفَون', 'مصطفون', 'مصطفىون'], correctIndex: 0, points: 4 },
      { q: 'أين الفعل المضارع المرفوع؟', options: ['يذهبُ محمدٌ للمدرسة', 'لم يذهبْ', 'لن ينجحَ', 'لا تلعبْ'], correctIndex: 0, points: 4 },
      { q: 'التاء المربوطة تُنطق هاءً عند الوقف — صح أم خطأ؟', options: ['صحيحة', 'خاطئة', '—', '—'], correctIndex: 0, points: 2 },
    ];
  }
  if (examId === 'ex-03') {
    return [
      { q: 'العدد الذري لعنصر الكربون هو؟', options: ['6', '12', '8', '14'], correctIndex: 0, points: 4 },
      { q: 'ما ناتج تفاعل الصوديوم مع الماء؟', options: ['هيدروجين وهيدروكسيد صوديوم', 'أكسجين وأكسيد صوديوم', 'كلور وكلوريد', 'لا يحدث تفاعل'], correctIndex: 0, points: 4 },
      { q: 'الرمز الكيميائي لجزيء الماء هو؟', options: ['H₂O', 'CO₂', 'H₂', 'O₂'], correctIndex: 0, points: 4 },
      { q: 'الرقم الهيدروجيني للمحلول المتعادل يساوي؟', options: ['7', '1', '14', '0'], correctIndex: 0, points: 4 },
      { q: 'مصطلح "التفاعل الطارد للحرارة" يعني؟', options: ['يطلق حرارة', 'يمتص حرارة', 'لا حرارة فيه', 'يتجمد'], correctIndex: 0, points: 4 },
    ];
  }
  return [
    { q: 'قيمة المشتقة الثانية للدالة x² عند x=3 تساوي؟', options: ['2', '6', '0', '3'], correctIndex: 0, points: 4 },
    { q: 'إذن ع (f(x)=3x) أيّ مما يلي صحيح؟', options: ['متصلة وقابلة للاشتقاق', 'غير متصلة', 'متقطعة', 'غير معرفة'], correctIndex: 0, points: 4 },
    { q: 'نهاية الدالة (x²-1)/(x-1) عند x=1 تساوي؟', options: ['2', '0', '1', 'غير موجودة'], correctIndex: 0, points: 4 },
    { q: 'مشتقة ln(x) تساوي؟', options: ['1/x', 'x', '1', 'ln(x)'], correctIndex: 0, points: 4 },
    { q: 'المعادلات التربيعية التي لها جذران متساويان يكون المميز:', options: ['صفرًا', 'موجبًا', 'سالبًا', 'غير محدد'], correctIndex: 0, points: 4 },
  ];
}

const subjById = (id: string) => SUBJECTS.find((s) => s.id === id) ?? null;

function demoExam(examId: string) {
  if (examId !== 'ex-01' && examId !== 'ex-02' && examId !== 'ex-03') return null;
  const seeds = questionsFor(examId);
  const questions = seeds.map((s, i) => ({
    id: `${examId}-q${i + 1}`,
    type: 'MCQ' as const,
    question: s.q,
    options: s.options,
    points: s.points,
    order: i + 1,
    correctAnswer: s.options[s.correctIndex],
  }));
  const start = new Date();
  start.setMinutes(start.getMinutes() - 5);
  const end = new Date();
  end.setMinutes(end.getMinutes() + (end.getHours() >= 14 ? 60 : 80));
  return {
    id: examId,
    name: examId === 'ex-01' ? 'اختبار الجبر — الوحدة الأولى' : examId === 'ex-02' ? 'اختبار اللغة العربية — النحو' : 'اختبار الكيمياء — التفاعلات',
    description: 'اختبر نفسك — أجب عن جميع الأسئلة قبل انتهاء الوقت.',
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    durationMinutes: 75,
    createdAt: end.toISOString(),
    subject: subjById(examId === 'ex-01' ? 'sub-math' : examId === 'ex-02' ? 'sub-arabic' : 'sub-chem'),
    teacher: { id: 't-01', fullName: 'د. أحمد عبد الرحمن' },
    students: [{ studentId: 'stu-1', fullName: 'عمر محمد' }],
    questions,
    isUpcoming: false,
    isActive: true,
    isEnded: false,
    myAttempt: { status: 'NOT_STARTED', score: null, percentage: null, maxScore: null, startedAt: null, submittedAt: null },
  };
}

function demoAttempt(examId: string) {
  return { id: `${examId}-at-1`, examId };
}

function totalPoints(examId: string) {
  return questionsFor(examId).reduce((acc, s) => acc + s.points, 0);
}

function demoAttemptResult(attemptId: string) {
  const examId = attemptId.endsWith('at-1') ? attemptId.slice(0, 6) : 'ex-01';
  const max = totalPoints(examId);
  const score = Math.round(max * 0.88);
  const seeds = questionsFor(examId);
  return {
    id: attemptId,
    status: 'SUBMITTED',
    startedAt: new Date(Date.now() - 50 * 60_000).toISOString(),
    submittedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    score,
    maxScore: max,
    percentage: 88,
    correctCount: Math.round(seeds.length * 0.8),
    totalCount: seeds.length,
    exam: {
      id: examId,
      name: demoExam(examId)?.name ?? 'اختبار',
      subject: subjById(examId === 'ex-02' ? 'sub-arabic' : examId === 'ex-03' ? 'sub-chem' : 'sub-math'),
      teacher: 'د. أحمد عبد الرحمن',
    },
    isOwner: true,
    questions: seeds.map((s, i) => ({
      id: `${examId}-q${i + 1}`,
      type: 'MCQ' as const,
      question: s.q,
      options: s.options,
      points: s.points,
      yourAnswer: s.options[0],
      isCorrect: true,
      correctAnswer: s.options[s.correctIndex],
      pointsEarned: s.points,
      graded: true,
    })),
  };
}

function demoExamResults(examId: string) {
  return {
    exam: { id: examId, name: demoExam(examId)?.name ?? 'اختبار' },
    summary: { totalStudents: 24, submitted: 21, absent: 3, average: 82, highest: 100, lowest: 45, passRate: 0.9 },
    results: Array.from({ length: 21 }, (_, i) => ({
      attemptId: `${examId}-at-${i + 1}`,
      student: { id: `stu-${i + 1}`, fullName: ['عمر محمد', 'نور محمد', 'سلمى حسن', 'يوسف وليد', 'مريم الطحاوي', 'أميرة صلاح', 'رنا فتحي', 'كريم رمضان', 'عبدالله خالد', 'مصطفى كامل'][i % 10] },
      score: 40 + ((i * 7) % 60),
      maxScore: totalPoints(examId),
      percentage: 55 + ((i * 9) % 45),
      submittedAt: new Date(Date.now() - i * 3_600_000).toISOString(),
    })),
  };
}

/* ------------------------------------------------------------------ */
/*  Assignments                                                        */
/* ------------------------------------------------------------------ */

function demoAssignment(id: string): ApiResponse<unknown>['data'] {
  const item = [
    { id: 'as-01', title: 'واجب الرياضيات: حل تمارين 4-2', subjectId: 'sub-math', deadline: 'الجمعة' },
    { id: 'as-02', title: 'مقال قصير عن دور النيل', subjectId: 'sub-arabic', deadline: 'السبت' },
    { id: 'as-03', title: 'تقرير تجربة التفاعل الكيميائي', subjectId: 'sub-chem', deadline: 'الأحد' },
    { id: 'as-04', title: 'تمارين التفاضل صفحة 85', subjectId: 'sub-math', deadline: 'الاثنين' },
  ].find((a) => a.id === id);
  return {
    id,
    title: item?.title ?? 'واجب',
    description: 'أجب عن جميع الأسئلة وارفع إجابتك قبل الموعد النهائي.',
    attachment: null,
    deadline: new Date(Date.now() + 24 * 3_600_000).toISOString(),
    createdAt: new Date(Date.now() - 48 * 3_600_000).toISOString(),
    subject: subjById(item?.subjectId ?? 'sub-math'),
    teacher: { id: 't-01', fullName: 'د. أحمد عبد الرحمن', photo: null },
    status: 'NOT_SUBMITTED',
    submission: null,
  };
}

function demoSubmissions(assignmentId: string) {
  const students = teacherStudents().slice(0, 8);
  return students.map((s, i) => ({
    id: `sub-${assignmentId}-${i}`,
    assignmentId,
    student: { id: s.id, fullName: s.fullName, photo: null },
    file: null,
    textAnswer: i % 3 === 0 ? 'تم الحل في دفتر الواجب ورفع صورة الإجابات.' : 'جاري المراجعة.',
    submittedAt: new Date(Date.now() - (i + 1) * 3_600_000).toISOString(),
    grade: i % 4 === 0 ? Math.round(70 + (i % 5) * 5) : null,
    feedback: i % 4 === 0 ? 'ممتاز، راجع النقطة الأخيرة في التمرين الثالث.' : null,
  }));
}

function demoLessonAttendance(lessonId: string) {
  return {
    lessonId,
    marked: false,
    rows: teacherStudents().slice(0, 10).map((s, i) => ({
      id: `${lessonId}-att-${i}`,
      student: { id: s.id, fullName: s.fullName, photo: null },
      arrivalChecked: false,
      status: i % 5 === 0 ? 'ABSENT' : 'PRESENT',
    })),
  };
}

function centerSettingsData() {
  return {
    centerId: 'c-nile',
    graceMinutes: 20,
    lateMark: 'LATE',
    allowSms: true,
    allowEmail: false,
  };
}

/* ------------------------------------------------------------------ */
/*  Center dispatch                                                    */
/* ------------------------------------------------------------------ */

function centerDispatch(segs: string[], m: string, q: Record<string, string>, _body: unknown): DemoRespondResult | null {
  const num = (v: string | undefined, fallback: number) => (v ? Number(v) || fallback : fallback);
  const segments = segs[0] === 'center' ? segs.slice(1) : segs;

  if (segments[0] === 'account') {
    if (segments[1] === 'branches') return out(branchesBrief());
    if (segments[1] === 'dashboard') return out(centerDashboard(q.branchId));
    if (segments[1] === 'stats') return out(centerStats());
    if (segments[1] === 'attendance') {
      if (segments[2] === 'stats') return out(centerAttendanceStats(q.date));
      if (segments[2] && m === 'PATCH') return out(demoSuccess());
      return out(centerAttendance(q.date));
    }
    if (segments[1] === 'classrooms') {
      if (m === 'POST') return out(demoSuccess());
      if (segments[2] && m === 'DELETE') return out(demoSuccess());
      if (segments[2] && m === 'PUT') return out(demoSuccess());
      return out(centerClassrooms());
    }
    if (segments[1] === 'students' && !segments[2] && m === 'GET') return out(centerStudents({ page: num(q.page, 1), limit: num(q.limit, 100), search: q.search, financialStatus: q.financialStatus, registrationStatus: q.registrationStatus }));
    if (segments[1] === 'students') {
      if (segments[2] === 'form-data') return out(centerStudentsFormData());
      if (segments[2] === 'stats') return out(centerStudentsStats());
      if (segments[2] && segments[3] === 'communications' && m === 'GET') return out(studentCommunications());
      if (segments[2] && segments[3] === 'enrollment' && m === 'PATCH') return out(demoSuccess());
      if (segments[2] && segments[3] === 'messages' && m === 'POST') return out(demoSuccess());
      if (segments[2]) return out(centerStudentDetail(segments[2]));
      return out(demoSuccess());
    }
    if (segments[1] === 'teachers') {
      if (segments[2] === 'form-data' && m === 'GET') return out(ok(groupsFormData()));
      if (segments[2] && segments[3] === 'availability' && m === 'GET') return out(ok([]));
      if (segments[2]) return out(centerTeacherDetail(segments[2]));
      if (m === 'POST') return out(demoSuccess());
      return out(centerTeachersAll({ page: num(q.page, 1), limit: num(q.limit, 20), search: q.search, status: q.status, branchId: q.branchId }));
    }
    if (segments[1] === 'groups') {
      if (segments[2] === 'form-data') return out(groupsFormData());
      if (segments[2] === 'summary') return out(centerGroupsSummary());
      if (segments[2] && segments[3] === 'students' && m === 'POST') return out(demoSuccess());
      if (segments[2] && segments[3] === 'students' && segments[4] && m === 'DELETE') return out(demoSuccess());
      if (segments[2] && m === 'PUT') return out(demoSuccess());
      if (segments[2] && m === 'DELETE') return out(demoSuccess());
      if (segments[2]) return out(centerGroupDetail(segments[2]));
      if (m === 'POST') return out(demoSuccess());
      return out(centerGroups({ search: q.search, teacherId: q.teacherId, roomId: q.roomId }));
    }
    if (segments[1] === 'employees') {
      if (m === 'GET') return out(centerEmployeesList({ limit: num(q.limit, 200) }));
      if (segments[2] && m === 'PUT') return out(demoSuccess());
      return out(demoSuccess());
    }
    if (segments[1] === 'tasks') {
      if (segments[2] && m === 'PUT') return out(demoSuccess());
      if (segments[2]) return out(centerTasks(segments[2]));
      if (m === 'POST') return out(demoSuccess());
      return out(centerTasks());
    }
    if (segments[1] === 'payments') {
      if (segments[2] === 'stats' && m === 'GET') return out(centerPaymentStats());
      if (segments[2] && segments[3] === 'status' && m === 'PATCH') return out(demoSuccess());
      if (m === 'POST') return out(demoSuccess());
      return out(centerPayments({ page: num(q.page, 1), limit: num(q.limit, 20), search: q.search, status: q.status }));
    }
    if (segments[1] === 'finance') {
      if (m === 'GET' && !segments[2]) return out(financeOverview());
      if (segments[2] === 'expenses') {
        if (m === 'POST') return out(demoSuccess());
        if (segments[3] && m === 'DELETE') return out(demoSuccess());
        return out(financeExpenses(q.take ? num(q.take, 6) : undefined));
      }
      if (segments[2] === 'collections') return out(financeCollections(q.search));
      if (segments[2] === 'ledger') {
        if (segments[3]) return out(financeLedgerDetail(segments[3]));
        return out(financeLedger(q.search));
      }
      if (segments[2] === 'settlements') {
        if (segments[3] === 'summary') return out(financeSettlementsSummary());
        if (segments[3] === 'calculate' && m === 'POST') return out(demoSuccess());
        if (segments[3] && (m === 'POST' || m === 'PATCH')) return out(demoSuccess());
        return out(financeSettlements());
      }
      return out(demoSuccess());
    }
    if (segments[1] === 'communications') {
      if (segments[2] === 'summary') return out(communicationsSummary());
      if (segments[2] === 'complaints') {
        if (segments[3] && m === 'PATCH') return out(demoSuccess());
        return out(communicationsComplaints({ search: q.search, severity: q.severity, status: q.status }));
      }
      if (segments[2] === 'messages') {
        if (segments[3] && segments[4] === 'read' && m === 'PATCH') return out(demoSuccess());
        if (m === 'POST') return out(demoSuccess());
        return out(communicationsMessages());
      }
      return out(demoSuccess());
    }
    if (segments[1] === 'broadcast') {
      if (segments[2] === 'summary') return out(broadcastSummary());
      if (segments[2] && (m === 'POST' || m === 'PATCH')) return out(demoSuccess());
      return out(broadcastsList({ search: q.search, status: q.status }));
    }
    if (segments[1] === 'schedule') {
      if (segments[2] === 'stats') return out(scheduleStats());
      if (segments[2] === 'form-data') return out(scheduleFormData());
      if (segments[2] === 'lessons' && m === 'POST') return out(demoSuccess());
      return out(schedulePage({ date: q.date, view: q.view, branchId: q.branchId }));
    }
    if (segments[1] === 'profile') {
      if (m === 'GET' && !segments[2]) return out(centerProfile());
      if (m === 'PUT' && !segments[2]) return out(demoSuccess());
      if (segments[2] === 'photos') {
        if (m === 'POST') return out(demoSuccess());
        if (segments[3] && m === 'DELETE') return out(demoSuccess());
        if (segments[3] && segments[4] === 'cover' && m === 'PATCH') return out(demoSuccess());
      }
      return out(demoSuccess());
    }
    if (segments[1] === 'settings') {
      if (m === 'GET' && segments[2] !== 'audit-log') return out(centerSettings());
      if (m === 'PUT') return out(demoSuccess());
      if (segments[2] === 'audit-log' && m === 'GET') return out(centerAuditLog({ q: q.q, category: q.category, result: q.result, page: num(q.page, 1), limit: num(q.limit, 20) }));
      return out(centerSettings());
    }
    if (segments[1] === 'reports') return out(centerReports({ period: q.period, compare: q.compare, branchId: q.branchId }));
    if (segments[1] === 'analytics') return out(centerAnalytics(q.period));
    if (segments[1] === 'accept-terms' && m === 'POST') return out(demoSuccess());
    return null;
  }

  /* Bare /center/* routes (branches, staff, groups, students, teachers, ...) */
  if (segments[0] === 'branches') {
    if (m === 'GET') return out(branchesFull());
    if (m === 'POST') return out(demoSuccess());
    if (segments[1] && (m === 'PUT' || m === 'DELETE')) return out(demoSuccess());
    if (segments[1] && m === 'GET') return out(ok(branchesFull().data?.find((b: { id: string }) => b.id === segments[1])));
    return null;
  }
  if (segments[0] === 'staff') {
    if (segments[1] === 'stats') return out(centerStaffStats());
    if (segments[1] === 'permission-matrix') return out(centerPermissionMatrix());
    if (m === 'POST') return out(demoSuccess());
    return out(centerStaff({ page: num(q.page, 1), limit: num(q.limit, 20), role: q.role, status: q.status, search: q.search }));
  }
  if (segments[0] === 'employees') {
    if (segments[1] && m === 'GET') return out(centerEmployeeDetail(segments[1]));
    if (segments[1] && m === 'PUT') return out(demoSuccess());
    if (segments[1] && segments[2] === 'status' && m === 'PATCH') return out(demoSuccess());
    return out(centerEmployeesList({ limit: num(q.limit, 200) }));
  }
  if (segments[0] === 'groups') {
    if (segments[1] === 'form-data') return out(groupsFormData());
    if (segments[1] === 'summary') return out(centerGroupsSummary());
    if (segments[1] && segments[2] === 'students' && m === 'POST') return out(demoSuccess());
    if (segments[1] && segments[2] === 'students' && segments[3] && m === 'DELETE') return out(demoSuccess());
    if (segments[1] && m === 'PUT') return out(demoSuccess());
    if (segments[1] && m === 'DELETE') return out(demoSuccess());
    if (segments[1]) return out(centerGroupDetail(segments[1]));
    if (m === 'POST') return out(demoSuccess());
    return out(centerGroups({ search: q.search, teacherId: q.teacherId, roomId: q.roomId }));
  }
  if (segments[0] === 'students') {
    if (segments[1] === 'stats') return out(centerStudentsStats());
    if (segments[1] === 'form-data') return out(centerStudentsFormData());
    if (segments[1] === 'remind-overdue' && m === 'POST') return out(ok({ count: 4 }));
    if (segments[1] && segments[2] === 'communications' && m === 'GET') return out(studentCommunications());
    if (segments[1] && segments[2] === 'enrollment' && m === 'PATCH') return out(demoSuccess());
    if (segments[1] && segments[2] === 'messages' && m === 'POST') return out(demoSuccess());
    if (segments[1] && m === 'GET') return out(centerStudentDetail(segments[1]));
    if (m === 'POST') return out(demoSuccess());
    return out(centerStudents({ page: num(q.page, 1), limit: num(q.limit, 100), search: q.search, financialStatus: q.financialStatus, registrationStatus: q.registrationStatus }));
  }
  if (segments[0] === 'teachers') {
    if (segments[1] === 'queue') return out(centerTeachersQueue());
    if (segments[1] && m === 'GET') return out(centerTeacherDetail(segments[1]));
    if (segments[1] && segments[2] === 'status' && m === 'PATCH') return out(demoSuccess());
    if (m === 'POST') return out(demoSuccess());
    if (m === 'PUT') return out(demoSuccess());
    return out(centerTeachersAll({ page: num(q.page, 1), limit: num(q.limit, 20), search: q.search, status: q.status, branchId: q.branchId }));
  }
  if (segments[0] === 'messages') {
    if (m === 'POST') return out(demoSuccess());
    if (segments[1] && m === 'PATCH') return out(demoSuccess());
    return out(demoSuccess());
  }
  if (segments[0] === 'bookings') {
    if (segments[1] === 'schedule' && m === 'GET') return out(bookingsSchedule({ date: q.date, branchId: q.branchId }));
    if (segments[1] && segments[2] === 'status' && m === 'PATCH') return out(demoSuccess());
    if (m === 'POST') return out(demoSuccess());
    return out(ok([]));
  }
  if (segments[0] === 'transport') {
    if (segments[1] === 'summary') return out(transportSummary());
    if (segments[1] === 'students') return out(transportStudents());
    if (segments[1] === 'drivers') return out(transportDrivers());
    if (segments[1] === 'subscribe' && m === 'POST') return out(demoSuccess());
    if (segments[1] && segments[2] === 'subscriptions' && m === 'DELETE') return out(demoSuccess());
    if (segments[1] && m === 'DELETE') return out(demoSuccess());
    if (segments[1] && m === 'PUT') return out(demoSuccess());
    if (m === 'POST') return out(demoSuccess());
    return out(transportRoutesList());
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Public teacher detail helpers (avoid name clash with reviewsFor)   */
/* ------------------------------------------------------------------ */

function reviewsForPublic(t: (typeof TEACHERS)[number]) {
  const names = ['عبدالله', 'سلمى', 'مصطفى كامل', 'أميرة صلاح', 'يوسف وليد', 'مريم الطحاوي', 'خالد رمضان'];
  const comments = [
    'شرح ممتاز وبسيط، نتيجة واضحة في آخر شهرين.',
    'متابعة مستمرة مع ولي الأمر وتقارير دورية.',
    'أفضل مدرس جربته — حصص منظمة وفي وقتها.',
    'صبر وشرح راقي، المواد الصعبة أصبحت سهلة.',
    'التزام تام بالمواعيد وتقييم مستمر للمستوي.',
    'طريقة الشرح ممتعة وثابتة لحد الامتحانات.',
    'مدرس شاطر ومخلص، أنصح بيه لكل الطلاب.',
  ];
  const count = 3;
  const reviews = Array.from({ length: count }, (_, i) => ({
    id: `${t.id}-rev-${i}`,
    stars: Math.round(t.rating * 10) / 10 >= 4.8 ? 5 : Math.round(t.rating * 10) / 10 >= 4.3 ? 4 : 4 - (i % 2),
    comment: comments[(parseInt(t.id.slice(-2), 10) + i) % comments.length],
    createdAt: new Date(Date.now() - (i + 3) * 86_400_000).toISOString(),
    author: {
      type: (i % 2 === 0 ? 'parent' : 'student') as 'student' | 'parent',
      fullName: names[(parseInt(t.id.slice(-2), 10) + i) % names.length],
      photo: null,
    },
  }));
  return { reviews, total: t.ratingCount };
}