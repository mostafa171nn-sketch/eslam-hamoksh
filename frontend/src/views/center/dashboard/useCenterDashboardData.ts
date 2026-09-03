'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';

export type LessonStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface ScheduleItem {
  id: string;
  subject: string;
  teacherName: string;
  roomName: string;
  startTime: string;
  endTime: string;
  studentCount: number;
  enrolledCount: number;
  date: string;
  status: LessonStatus;
}

export interface CenterDashboardStats {
  totalRooms: number;
  totalTeachers: number;
  totalStudents: number;
  totalEmployees: number;
  totalBranches: number;
  todayLessons: number;
  completedLessons: number;
  upcomingLessons: number;
  cancelledLessons: number;
  todayRevenue: number;
  pendingPayments: number;
  paidPayments: number;
  todayAttendance: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
  };
  activeEnrollments: number;
  pendingEnrollments: number;
}

interface BackendStats {
  totalStudents: number;
  totalTeachers: number;
  totalEmployees: number;
  totalBranches: number;
  totalRooms: number;
  todayLessons: number;
  completedLessons: number;
  upcomingLessons: number;
  cancelledLessons: number;
  todayAttendance: { present: number; absent: number; late: number; excused: number; total: number };
  todayRevenue: number;
  pendingPayments: number;
  paidPayments: number;
  activeEnrollments: number;
  pendingEnrollments: number;
}

interface BackendLesson {
  id: string;
  subject: string;
  teacher: string;
  teacherId: string;
  grade: string;
  room: string;
  branch: string;
  date: string;
  startTime: string;
  endTime: string;
  studentCount: number;
  enrolledCount: number;
  status: LessonStatus;
}

export interface RoomInfo {
  id: string;
  name: string;
  capacity: number;
  status: string;
  branch?: string | null;
}

export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

interface BackendRoom {
  id: string;
  name: string;
  capacity: number;
  status: string;
  branch?: string | null;
  branchId?: string | null;
}

function normalizeLesson(raw: BackendLesson): ScheduleItem {
  return {
    id: raw.id,
    subject: raw.subject,
    teacherName: raw.teacher,
    roomName: raw.room,
    startTime: raw.startTime,
    endTime: raw.endTime,
    studentCount: raw.studentCount,
    enrolledCount: raw.enrolledCount,
    date: raw.date,
    status: raw.status,
  };
}

export interface CenterDashboardData {
  stats: CenterDashboardStats | null;
  statsLoading: boolean;
  statsError: string;
  schedule: ScheduleItem[];
  scheduleLoading: boolean;
  scheduleError: string;
  rooms: RoomInfo[];
  roomsLoading: boolean;
  roomsError: string;
  attendance: AttendanceStats | null;
  attendanceLoading: boolean;
  attendanceError: string;
  reload: () => void;
}

export function useCenterDashboardData(date?: string): CenterDashboardData {
  const { user } = useAuth();
  const [tick, setTick] = useState(0);
  const [stats, setStats] = useState<CenterDashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState('');
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState('');
  const [attendance, setAttendance] = useState<AttendanceStats | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;

    api
      .get<BackendStats>('/center/account/stats')
      .then((res) => {
        if (!active) return;
        setStats({
          totalRooms: res.data.totalRooms,
          totalTeachers: res.data.totalTeachers,
          totalStudents: res.data.totalStudents,
          totalEmployees: res.data.totalEmployees,
          totalBranches: res.data.totalBranches,
          todayLessons: res.data.todayLessons,
          completedLessons: res.data.completedLessons,
          upcomingLessons: res.data.upcomingLessons,
          cancelledLessons: res.data.cancelledLessons,
          todayRevenue: res.data.todayRevenue,
          pendingPayments: res.data.pendingPayments,
          paidPayments: res.data.paidPayments,
          todayAttendance: res.data.todayAttendance,
          activeEnrollments: res.data.activeEnrollments,
          pendingEnrollments: res.data.pendingEnrollments,
        });
      })
      .catch((e) => {
        if (active) setStatsError(e?.message ?? '');
      })
      .finally(() => {
        if (active) setStatsLoading(false);
      });

    api
      .get<BackendLesson[]>('/center/account/lessons/today', date ? { date } : {})
      .then((res) => {
        if (active) setSchedule(res.data.map(normalizeLesson));
      })
      .catch((e) => {
        if (active) setScheduleError(e?.message ?? '');
      })
      .finally(() => {
        if (active) setScheduleLoading(false);
      });

    api
      .get<BackendRoom[]>('/center/account/classrooms')
      .then((res) => {
        if (active)
          setRooms(res.data.map((r) => ({ id: r.id, name: r.name, capacity: r.capacity, status: r.status, branch: r.branch })));
      })
      .catch((e) => {
        if (active) setRoomsError(e?.message ?? '');
      })
      .finally(() => {
        if (active) setRoomsLoading(false);
      });

    api
      .get<AttendanceStats>('/center/account/attendance/stats', date ? { date } : {})
      .then((res) => {
        if (active) setAttendance(res.data);
      })
      .catch((e) => {
        if (active) setAttendanceError(e?.message ?? '');
      })
      .finally(() => {
        if (active) setAttendanceLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, date, tick]);

  const reload = () => setTick((t) => t + 1);

  return {
    stats,
    statsLoading,
    statsError,
    schedule,
    scheduleLoading,
    scheduleError,
    rooms,
    roomsLoading,
    roomsError,
    attendance,
    attendanceLoading,
    attendanceError,
    reload,
  };
}

export function attendanceRate(att: AttendanceStats | null): number {
  if (!att || att.total === 0) return 0;
  return Math.round(((att.present + att.late) / att.total) * 100);
}
