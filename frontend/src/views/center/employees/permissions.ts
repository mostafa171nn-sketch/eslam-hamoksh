import type { DictKey } from '../../../i18n';

export type AccessLevel = 'none' | 'view' | 'addEdit' | 'full';

const FULL_OPS = new Set(['approve', 'reject', 'refund', 'delete']);
const ADD_EDIT_OPS = new Set(['create', 'update', 'grade', 'mark', 'verify', 'cancel', 'assign', 'send']);

export function accessLevelForOps(ops: string[] | undefined): AccessLevel {
  if (!ops || ops.length === 0) return 'none';
  if (ops.some((op) => FULL_OPS.has(op))) return 'full';
  if (ops.some((op) => ADD_EDIT_OPS.has(op))) return 'addEdit';
  return 'view';
}

export const LEVEL_LABEL_KEYS: Record<AccessLevel, DictKey> = {
  none: 'noAccessLevel',
  view: 'viewLevel',
  addEdit: 'addEditLevel',
  full: 'fullApprovalLevel',
};

export const ROLE_LABEL_KEYS: Record<string, DictKey> = {
  CENTER_ADMIN: 'roleCenterAdminLabel',
  CENTER_EMPLOYEE: 'centerEmployee',
  RECEPTIONIST: 'receptionist',
  TEACHER_ASSISTANT: 'teacherAssistant',
};

const MODULE_LABEL_KEYS: Record<string, DictKey> = {
  teachers: 'teachers',
  students: 'students',
  parents: 'parents',
  lessons: 'lessons',
  assignments: 'assignments',
  exams: 'exams',
  payments: 'payments',
  subscriptions: 'subscriptions',
  reports: 'reports',
  locations: 'locations',
  invoices: 'invoices',
  documents: 'documents',
  attendance: 'attendance',
  grades: 'grades',
  subjects: 'subjects',
  centers: 'centers',
  chat: 'chat',
  rooms: 'rooms',
  wallets: 'wallets',
  plans: 'plans',
};

export function moduleLabelKey(domain: string): DictKey {
  return MODULE_LABEL_KEYS[domain] ?? (domain as DictKey);
}

const ACTIVITY_LABEL_KEYS: Record<string, DictKey> = {
  created_employee: 'activityCreatedEmployee',
  updated_employee: 'activityUpdatedEmployee',
  set_employee_status_active: 'activityStatusActive',
  set_employee_status_inactive: 'activityStatusInactive',
  set_employee_status_suspended: 'activityStatusSuspended',
  deactivated_employee: 'activityStatusInactive',
  assigned_employee_role: 'activityRoleAssigned',
  created_task: 'activityTaskCreated',
  updated_task: 'activityTaskUpdated',
  deleted_task: 'activityTaskDeleted',
};

export function activityLabelKey(action: string): DictKey {
  return ACTIVITY_LABEL_KEYS[action] ?? (action as DictKey);
}

export function accessLevelLabel(level: AccessLevel): DictKey {
  return LEVEL_LABEL_KEYS[level];
}

export function accessLevelTone(level: AccessLevel): 'green' | 'amber' | 'blue' | 'slate' {
  switch (level) {
    case 'full': return 'green';
    case 'addEdit': return 'blue';
    case 'view': return 'amber';
    default: return 'slate';
  }
}

export function groupPermissions(permissions: string[]): { domain: string; ops: string[] }[] {
  const map = new Map<string, string[]>();
  for (const name of permissions) {
    const dot = name.indexOf('.');
    const domain = dot === -1 ? name : name.slice(0, dot);
    const op = dot === -1 ? '' : name.slice(dot + 1);
    const ops = map.get(domain) ?? [];
    if (op && !ops.includes(op)) ops.push(op);
    map.set(domain, ops);
  }
  return Array.from(map.entries())
    .map(([domain, ops]) => ({ domain, ops }))
    .sort((a, b) => a.domain.localeCompare(b.domain));
}