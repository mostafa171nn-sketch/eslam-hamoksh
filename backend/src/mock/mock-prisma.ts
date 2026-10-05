import type { PrismaClient } from '@prisma/client';
import { getStore, seedStore, type MockStore } from './mock-store';

/* ---------- relation resolver for include --------------------- */
const RELATIONS: Record<string, Record<string, string>> = {
  Teacher: { userId: 'User' },
  Student: { userId: 'User', gradeId: 'Grade', centerId: 'Center' },
  Parent: { userId: 'User', centerId: 'Center' },
  Lesson: { teacherId: 'Teacher', studentId: 'Student', subjectId: 'Subject', centerId: 'Center', locationId: 'Location', roomId: 'Room' },
  Attendance: { lessonId: 'Lesson', studentId: 'Student', centerId: 'Center' },
  AttendanceQrSession: { studentId: 'Student', lessonId: 'Lesson', centerId: 'Center' },
  Payment: { studentId: 'Student', parentId: 'Parent', teacherId: 'Teacher', lessonId: 'Lesson', subscriptionId: 'BillingSubscription', centerId: 'Center' },
  RoomBooking: { centerId: 'Center', roomId: 'Room', teacherId: 'Teacher', groupId: 'Group' },
  Broadcast: { centerId: 'Center' },
  Wallet: { userId: 'User', centerId: 'Center' },
  WalletTransaction: { walletId: 'Wallet' },
  Document: { ownerId: 'User', centerId: 'Center', verifiedById: 'User' },
  Exam: { teacherId: 'Teacher', subjectId: 'Subject', centerId: 'Center' },
  Assignment: { teacherId: 'Teacher', subjectId: 'Subject', centerId: 'Center' },
  Group: { centerId: 'Center', subjectId: 'Subject', teacherId: 'Teacher', roomId: 'Room', branchId: 'Location' },
  TransportRoute: { centerId: 'Center' },
  TransportStudent: { routeId: 'TransportRoute', studentId: 'Student' },
  Expense: { centerId: 'Center' },
  EmployeeTask: { centerId: 'Center', assigneeId: 'User' },
  CenterMessage: { centerId: 'Center', senderId: 'User', recipientId: 'User' },
  Settlement: { centerId: 'Center', teacherId: 'Teacher' },
  Invoice: { centerId: 'Center', paymentId: 'Payment' },
  Rating: { teacherId: 'Teacher', studentId: 'Student', parentId: 'Parent' },
  CenterRating: { centerId: 'Center', userId: 'User' },
  CenterSettings: { centerId: 'Center' },
  BillingSubscription: { studentId: 'Student', parentId: 'Parent', teacherId: 'Teacher', centerId: 'Center' },
  Conversation: { centerId: 'Center', teacherId: 'Teacher', studentId: 'Student' },
  Message: { conversationId: 'Conversation', senderId: 'User' },
  GroupEnrollment: { groupId: 'Group', studentId: 'Student' },
  LessonEnrollment: { lessonId: 'Lesson', studentId: 'Student' },
  TeacherStudent: { teacherId: 'Teacher', studentId: 'Student' },
  TeacherSubject: { teacherId: 'Teacher', subjectId: 'Subject' },
  TeacherGrade: { teacherId: 'Teacher', gradeId: 'Grade' },
  TeacherAvailability: { teacherId: 'Teacher', locationId: 'Location' },
  StudentSubject: { studentId: 'Student', subjectId: 'Subject' },
  ParentStudent: { parentId: 'Parent', studentId: 'Student' },
  TeacherAssistant: { assistantId: 'User', teacherId: 'Teacher', centerId: 'Center' },
  Complaint: { centerId: 'Center', assigneeId: 'User' },
  CenterRegistrationRequest: { centerId: 'Center', requesterId: 'User' },
  ActivityLog: { userId: 'User', centerId: 'Center' },
  Notification: { userId: 'User', broadcastId: 'Broadcast' },
  PasswordResetToken: { userId: 'User' },
  RefreshToken: { userId: 'User' },
  Center: { planId: 'SubscriptionPlan' },
  RolePermission: { permissionId: 'Permission' },
};

/* ---------- model name → store map key ------------------------- */
function storeKey(model: string): string {
  if (!model) return model;
  const pl: Record<string, string> = {
    Attendance: 'attendance',
    TeacherAvailability: 'teacherAvailabilities',
    ActivityLog: 'activityLogs',
    PasswordResetToken: 'passwordResetTokens',
    RefreshToken: 'refreshTokens',
    NotificationTemplate: 'notificationTemplates',
    PhoneVerification: 'phoneVerifications',
    CenterRegistrationRequest: 'centerRegistrationRequests',
    SubscriptionPlan: 'subscriptionPlans',
  };
  if (pl[model]) return pl[model];
  const pascal = model[0].toUpperCase() + model.slice(1);
  if (pl[pascal]) return pl[pascal];
  const camel = model[0].toLowerCase() + model.slice(1);
  return camel.endsWith('s') ? camel : camel + 's';
}

/* ---------- generic filter ----------------------------------- */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function maybeDate(x: any): any {
  if (x instanceof Date) return x;
  if (typeof x === 'string' && ISO_DATE_RE.test(x)) return new Date(x);
  return x;
}
function eqDates(a: any, b: any): boolean {
  if (a === b) return true;
  const da = maybeDate(a);
  const db = maybeDate(b);
  return da instanceof Date && db instanceof Date && da.getTime() === db.getTime();
}

interface WhereCtx { store?: MockStore; model?: string; }

function matchesWhere(item: any, where: any, ctx?: WhereCtx): boolean {
  if (!where) return true;
  for (const [k, v] of Object.entries(where)) {
    if (v === null || v === undefined) continue;
     if (typeof v === 'object' && !Array.isArray(v)) {
       const opts = v as Record<string, any>;
       const hasOperator = ['in', 'gte', 'gt', 'lte', 'lt', 'contains', 'startsWith', 'endsWith', 'has', 'not', 'equals', 'notIn'].some((o) => o in opts);
       if (!hasOperator) {
         // Relation filter (no operators): Prisma matches the related row(s).
         //   - to-one  (item[k] is an object)  -> nested recursion
         //   - to-many (item[k] is an array)   -> implicit `some` semantics,
         //     plus explicit some/every/none wrappers used by the app.
         let related: any = item[k];
         if (related === undefined && ctx?.store && ctx?.model && !Object.prototype.hasOwnProperty.call(item, k)) {
           // Stored rows keep FK columns (userId...) rather than the relation
           // object, so resolve the related row(s) the same way `include` does.
           const { related: resolved, relatedModel } = resolveRelation(item, ctx.store, ctx.model, k);
           if (relatedModel) {
             if (Array.isArray(resolved)) {
               if (opts.some !== undefined) {
                 if (!resolved.some((r: any) => matchesWhere(r, opts.some, ctx))) return false;
               } else if (opts.every !== undefined) {
                 if (!resolved.every((r: any) => matchesWhere(r, opts.every, ctx))) return false;
               } else if (opts.none !== undefined) {
                 if (resolved.some((r: any) => matchesWhere(r, opts.none, ctx))) return false;
               } else if (!resolved.some((r: any) => matchesWhere(r, opts, ctx))) {
                 return false;
               }
             } else if (resolved && typeof resolved === 'object') {
               if (!matchesWhere(resolved, opts, ctx)) return false;
             } else {
               // Relation resolves to nothing — Prisma excludes the row.
               return false;
             }
             continue;
           }
         }
         if (Array.isArray(related)) {
           if (opts.some !== undefined) {
             if (!related.some((r: any) => matchesWhere(r, opts.some, ctx))) return false;
           } else if (opts.every !== undefined) {
             if (!related.every((r: any) => matchesWhere(r, opts.every, ctx))) return false;
           } else if (opts.none !== undefined) {
             if (related.some((r: any) => matchesWhere(r, opts.none, ctx))) return false;
           } else if (!related.some((r: any) => matchesWhere(r, opts, ctx))) {
             return false;
           }
         } else if (related && typeof related === 'object') {
           if (!matchesWhere(related, opts, ctx)) return false;
         }
         continue;
       }
       if (opts.in) {
         if (!opts.in.some((y: any) => eqDates(item[k], y))) return false;
       } else if (opts.notIn) {
         if (opts.notIn.some((y: any) => eqDates(item[k], y))) return false;
       } else if (opts.not !== undefined) {
         if (eqDates(item[k], opts.not)) return false;
       } else if (opts.gte !== undefined && new Date(maybeDate(item[k]) ?? 0).getTime() < new Date(maybeDate(opts.gte)).getTime()) return false;
       else if (opts.lte !== undefined && new Date(maybeDate(item[k]) ?? 0).getTime() > new Date(maybeDate(opts.lte)).getTime()) return false;
       else if (opts.gt !== undefined && new Date(maybeDate(item[k]) ?? 0).getTime() <= new Date(maybeDate(opts.gt)).getTime()) return false;
       else if (opts.lt !== undefined && new Date(maybeDate(item[k]) ?? 0).getTime() >= new Date(maybeDate(opts.lt)).getTime()) return false;
       else if (opts.contains !== undefined && !String(item[k] ?? '').includes(opts.contains)) return false;
       else if (opts.startsWith !== undefined && !String(item[k] ?? '').startsWith(opts.startsWith)) return false;
       else if (opts.endsWith !== undefined && !String(item[k] ?? '').endsWith(opts.endsWith)) return false;
       else if (opts.has !== undefined) {
         const arr = item[k];
         if (!Array.isArray(arr) || !arr.includes(opts.has)) return false;
       }
    } else if (Array.isArray(v)) {
      if (!v.some((y: any) => eqDates(item[k], y))) return false;
    } else {
      if (!eqDates(item[k], v)) return false;
    }
  }
  return true;
}

/* ---------- nested-write normalisation ----------------------- */
/* Prisma resolves a nested write like `user: { connect: { id } }` into the
   model's FK column (`userId`). The mock used to persist the literal payload,
   so the FK stayed null and every later relation lookup silently matched
   nothing (e.g. refresh found a record with `userId === undefined`). */
const NESTED_WRITES = new Set(['connect', 'set', 'disconnect']);

/** FK column backing a to-one relation `rel` owned by `model`. */
function fkColumnFor(model: string, rel: string): string | null {
  const M = (model[0]?.toUpperCase() ?? '') + model.slice(1);
  const relMap = (RELATIONS as any)[M] ?? {};
  // relation name is the FK field minus `Id` (userId -> user)
  const known = Object.keys(relMap).find((f: string) => f.replace(/Id$/, '') === rel);
  if (known) return known;
  // A to-many owned by another table has no column here — never invent one.
  if (REVERSE_KEYS[`${M}.${rel}`]) return null;
  // The schema uses no @map, so a to-one FK is always named `<rel>Id`.
  return `${rel}Id`;
}

function normalizeWrites(model: string, data: any): any {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  const out: any = { ...data };
  for (const [rel, val] of Object.entries(data)) {
    if (!val || typeof val !== 'object' || Array.isArray(val)) continue;
    const nested = val as Record<string, any>;
    const keys = Object.keys(nested);
    // Only rewrite an explicit Prisma nested-write payload; seeded records
    // embed the related row itself, which must be left untouched.
    if (!keys.length || !keys.every((k) => NESTED_WRITES.has(k))) continue;
    const fk = fkColumnFor(model, rel);
    if (!fk) continue;
    if (nested.disconnect) { out[fk] = null; delete out[rel]; continue; }
    const target = nested.connect ?? nested.set;
    const id = Array.isArray(target) ? null : target?.id;
    if (id !== undefined && id !== null) { out[fk] = id; delete out[rel]; }
  }
  return out;
}

/* Prisma returns JS Date for DateTime columns; revives stored ISO strings. */
function deepToDates(v: any): any {
  if (v instanceof Date) return v;
  if (Array.isArray(v)) return v.map(deepToDates);
  if (v && typeof v === 'object') {
    const o: any = {};
    for (const key of Object.keys(v)) o[key] = deepToDates(v[key]);
    return o;
  }
  if (typeof v === 'string' && ISO_DATE_RE.test(v)) return new Date(v);
  return v;
}

function applySelect(item: any, select: any, store: MockStore, model: string): any {
  if (!select || !item) return item;
  const out: any = {};
  const M = (model[0]?.toUpperCase() ?? '') + model.slice(1);
  const relMap = (RELATIONS as any)[M] ?? {};
  const relModelFor = (rel: string): string | null => {
    const fk = Object.keys(relMap).find((f: string) => f.replace(/Id$/, '') === rel);
    if (fk) return relMap[fk];
    return REVERSE_KEYS[`${M}.${rel}`] ?? null;
  };
  for (const [k, v] of Object.entries(select)) {
    const relModel = relModelFor(k);
    if (typeof v === 'object' && v !== null) {
      const child: any = v;
      const subSelect = child.select;
      const subInclude = child.include;
      const rel = item[k];
      if (Array.isArray(rel)) {
        out[k] = rel.map((r: any) => applyQuerySubs(r, store, relModel ?? model, subSelect, subInclude));
      } else if (rel && typeof rel === 'object') {
        out[k] = applyQuerySubs(rel, store, relModel ?? model, subSelect, subInclude);
      } else {
        out[k] = rel ?? null;
      }
    } else if (relModel) {
      const rel = item[k];
      if (Array.isArray(rel)) {
        out[k] = rel.map((r: any) => applyQuerySubs(r, store, relModel, undefined, undefined));
      } else if (rel && typeof rel === 'object') {
        out[k] = applyQuerySubs(rel, store, relModel, undefined, undefined);
      } else {
        out[k] = rel ?? null;
      }
    } else {
      out[k] = item[k];
    }
  }
  return out;
}

/* Applies include + select to a fetched record. Select relations (scalar-`true`
   or nested-object values) are resolved before projection. */
function applyQuerySubs(item: any, store: MockStore, model: string, select?: any, include?: any): any {
  let out = item;
  if (!out) return out;
  if (include) out = resolveInclude(out, include, store, model);
  if (select) {
    const M = (model[0]?.toUpperCase() ?? '') + model.slice(1);
    const relMap = (RELATIONS as any)[M] ?? {};
    const relKeys = Object.keys(select).filter(
      (k) => !!Object.keys(relMap).find((f: string) => f.replace(/Id$/, '') === k) || !!REVERSE_KEYS[`${M}.${k}`],
    );
    const missing = relKeys.filter((k) => out[k] === undefined || out[k] === null);
    if (missing.length) {
      const inc = Object.fromEntries(missing.map((k) => [k, true]));
      out = resolveInclude(out, inc, store, model);
    }
    out = applySelect(out, select, store, model);
  }
  return out;
}

function resolveRelation(item: any, store: MockStore, model: string, rel: string): { related: any; relatedModel: string | null } {
  const M = (model[0]?.toUpperCase() ?? '') + model.slice(1);
  const relMap = (RELATIONS as any)[M] ?? {};
  // relation name usually = fk field minus 'Id' (userId -> user)
  const fkField = Object.keys(relMap).find((k: string) => k.replace(/Id$/, '') === rel);
  // Prefer an already-embedded relation (seeded records embed e.g. permission/teacher).
  let related: any = item[rel] !== undefined && item[rel] !== null ? item[rel] : null;
  let relatedModel: string | null = fkField ? relMap[fkField] : null;
  if (!related && fkField) {
    const targetModel = relMap[fkField];
    const fkVal = item[fkField];
    const target = (store as any)[storeKey(targetModel)] as Map<string, any> | undefined;
    if (fkVal && target) {
      related = target.get(fkVal) ?? [...target.values()].find((r: any) => r.id === fkVal);
      relatedModel = targetModel;
    }
  }
  const reverseTarget = !related ? REVERSE_KEYS[`${M}.${rel}`] : null;
  if (reverseTarget) {
    const fkName = model[0].toLowerCase() + model.slice(1) + 'Id';
    const target = (store as any)[storeKey(reverseTarget)] as Map<string, any> | undefined;
    if (target) {
      const found = [...target.values()].filter((r: any) => (r as any)[fkName] === item.id);
      if (M === 'User') {
        // user.<teacher|student|parent|employee> is to-one in the schema
        related = found[0] ?? null;
      } else {
        related = found;
      }
      relatedModel = reverseTarget;
    }
  }
  return { related, relatedModel };
}

function applyOrderBy(list: any[], orderBy: any): any[] {
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  return list.sort((a: any, b: any) => {
    for (const o of orders) {
      if (!o || typeof o !== 'object' || Array.isArray(o)) continue;
      const key = Object.keys(o)[0];
      const dir = o[key] === 'desc' ? -1 : 1;
      const va = a[key] ?? '';
      const vb = b[key] ?? '';
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
    }
    return 0;
  });
}

function resolveCount(item: any, store: MockStore, model: string, M: string, spec: any): any {
  const cnt: any = {};
  for (const [k, s2] of Object.entries(spec ?? {})) {
    if (s2 === false) continue;
    if (k === '_all') continue;
    const { related } = resolveRelation(item, store, model, k);
    let val = 0;
    if (Array.isArray(related)) {
      val = related.length;
      const where = s2 && typeof s2 === 'object' && (s2 as any).where;
      if (where) val = related.filter((r: any) => matchesWhere(r, where)).length;
    } else if (related && typeof related === 'object') {
      val = 1;
    }
    cnt[k] = val;
  }
  if (spec?._all === true) {
    cnt._all = Object.values(cnt).reduce((s: number, n) => s + (n as number), 0);
  }
  return cnt;
}

function resolveInclude(item: any, include: any, store: MockStore, model: string): any {
  if (!include || !item) return item;
  const out = { ...item };
  const M = (model[0]?.toUpperCase() ?? '') + model.slice(1);
  for (const [rel, subRaw] of Object.entries(include)) {
    if (subRaw === false) continue;
    if (rel === '_count') {
      out[rel] = resolveCount(item, store, model, M, subRaw === true ? { _all: true } : ((subRaw as any).select ?? subRaw));
      continue;
    }
    const { related, relatedModel } = resolveRelation(item, store, model, rel);
    const spec: any = subRaw && typeof subRaw === 'object' ? subRaw : null;
    let arr = Array.isArray(related) ? [...related] : related;
    if (Array.isArray(arr) && spec && spec.where) arr = arr.filter((r: any) => matchesWhere(r, spec.where));
    if (Array.isArray(arr) && spec && spec.orderBy) arr = applyOrderBy(arr, spec.orderBy);
    const sel = spec?.select;
    const inc = spec?.include;
    if (Array.isArray(arr)) {
      out[rel] = (sel || inc) && arr.length ? arr.map((r: any) => applyQuerySubs(r, store, relatedModel ?? model, sel, inc)) : arr;
    } else if (arr && typeof arr === 'object') {
      out[rel] = (sel || inc) ? applyQuerySubs(arr, store, relatedModel ?? model, sel, inc) : arr;
    } else {
      out[rel] = arr ?? null;
    }
  }
  return out;
}

/* Reverse relations, scoped by owning model (e.g. "Teacher.subjects"). To-many
   targets are JOIN/child tables whose records hold <Owner>Id = this id, so they
   are resolved with a plain filter of the owning model's FK column. */
const REVERSE_KEYS: Record<string, string> = {
  'User.teacher': 'Teacher',
  'User.student': 'Student',
  'User.parent': 'Parent',
  'User.employee': 'Employee',
  'Teacher.subjects': 'TeacherSubject',
  'Teacher.grades': 'TeacherGrade',
  'Teacher.availability': 'TeacherAvailability',
  'Teacher.students': 'TeacherStudent',
  'Teacher.lessons': 'Lesson',
  'Teacher.payments': 'Payment',
  'Teacher.settlements': 'Settlement',
  'Teacher.bookings': 'RoomBooking',
  'Teacher.groups': 'Group',
  'Teacher.ratings': 'Rating',
  'Teacher.roomBookings': 'RoomBooking',
  'Student.studentSubjects': 'StudentSubject',
  'Student.teachers': 'TeacherStudent',
  'Student.parents': 'ParentStudent',
  'Student.attendance': 'Attendance',
  'Student.payments': 'Payment',
  'Student.billingSubscriptions': 'BillingSubscription',
  'Student.lessonEnrollments': 'LessonEnrollment',
  'Student.groupEnrollments': 'GroupEnrollment',
  'Parent.children': 'ParentStudent',
  'Center.locations': 'Location',
  'Center.rooms': 'Room',
  'Center.teachers': 'Teacher',
  'Center.students': 'Student',
  'Center.parents': 'Parent',
  'Center.lessons': 'Lesson',
  'Center.payments': 'Payment',
  'Center.documents': 'Document',
  'Center.activityLogs': 'ActivityLog',
  'Group.students': 'GroupEnrollment',
  'Group.bookings': 'RoomBooking',
  'Group.enrollments': 'GroupEnrollment',
  'Lesson.enrollments': 'LessonEnrollment',
  'Lesson.attendance': 'Attendance',
  'Conversation.messages': 'Message',
};

/* ---------- per-model operations ----------------------------- */
function findUnique(store: MockStore, model: string, where: any, select?: any, include?: any): any {
  const map = (store as any)[storeKey(model)] as Map<string, any>;
  if (!map) return null;
  if (!where) return null;
  const keys = Object.keys(where);
  let found: any = null;
  if (keys.length === 1 && keys[0] === 'id') {
    const v = where.id;
    if (typeof v === 'string' || typeof v === 'number') {
      found = map.get(String(v)) ?? null;
    }
  }
  if (!found && !(keys.length === 1 && keys[0] === 'id')) {
    // Scan (handles unique fields like username, and composite where)
    for (const item of map.values()) {
      if (matchesWhere(item, where, { store, model })) { found = item; break; }
    }
  }
  if (!found) return null;
  return deepToDates(applyQuerySubs(found, store, model, select, include));
}

function findFirst(store: MockStore, model: string, where: any, orderBy?: any, select?: any, include?: any): any {
  const results = findMany(store, model, where, orderBy, 0, 1, select, include);
  return results[0] ?? null;
}

function findMany(store: MockStore, model: string, where: any, orderBy?: any, skip = 0, take?: number, select?: any, include?: any): any[] {
  const map = (store as any)[storeKey(model)] as Map<string, any>;
  if (!map) return [];
  let list = [...map.values()].filter((item: any) => matchesWhere(item, where, { store, model }));
  // orderBy
  if (orderBy) {
    const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
    list.sort((a: any, b: any) => {
      for (const o of orders) {
        const key = Object.keys(o)[0];
        const dir = o[key] === 'desc' ? -1 : 1;
        const va = a[key] ?? '';
        const vb = b[key] ?? '';
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
      }
      return 0;
    });
  }
  if (skip) list = list.slice(skip);
  if (take !== undefined) list = list.slice(0, take);
  return list.map((item: any) => deepToDates(applyQuerySubs(item, store, model, select, include)));
}

function count(store: MockStore, model: string, where: any): number {
  const map = (store as any)[storeKey(model)] as Map<string, any>;
  if (!map) return 0;
  return [...map.values()].filter((item: any) => matchesWhere(item, where, { store, model })).length;
}

function createItem(store: MockStore, model: string, data: any, select?: any, include?: any): any {
  const map = (store as any)[storeKey(model)] as Map<string, any>;
  const payload = normalizeWrites(model, data);
  const id = payload.id ?? `mock-${model.toLowerCase()}-${String(map.size + 1).padStart(3, '0')}`;
  const item = { id, ...payload, createdAt: payload.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() };
  map.set(id, item);
  return deepToDates(applyQuerySubs(item, store, model, select, include));
}

function updateItem(store: MockStore, model: string, where: any, data: any, select?: any, include?: any): any {
  const map = (store as any)[storeKey(model)] as Map<string, any>;
  if (!map) return null;
  for (const [key, val] of map.entries()) {
    if (matchesWhere(val, where, { store, model })) {
      const updated = { ...val, ...normalizeWrites(model, data), id: val.id, updatedAt: new Date().toISOString() };
      map.set(key, updated);
      return deepToDates(applyQuerySubs(updated, store, model, select, include));
    }
  }
  return null;
}

function upsertItem(store: MockStore, model: string, where: any, createData: any, updateData: any): any {
  const existing = findUnique(store, model, where);
  if (existing) return updateItem(store, model, where, updateData);
  return createItem(store, model, createData);
}

function updateMany(store: MockStore, model: string, where: any, data: any): number {
  const map = (store as any)[storeKey(model)] as Map<string, any>;
  if (!map) return 0;
  let n = 0;
  for (const [key, val] of [...map.entries()]) {
    if (matchesWhere(val, where, { store, model })) {
      const updated = { ...val, ...normalizeWrites(model, data), id: val.id, updatedAt: new Date().toISOString() };
      map.set(key, updated);
      n++;
    }
  }
  return n;
}

function deleteItem(store: MockStore, model: string, where: any): any {
  const map = (store as any)[storeKey(model)] as Map<string, any>;
  if (!map) return null;
  for (const [key, val] of map.entries()) {
    if (matchesWhere(val, where, { store, model })) { map.delete(key); return val; }
  }
  return null;
}

function deleteMany(store: MockStore, model: string, where: any): number {
  const map = (store as any)[storeKey(model)] as Map<string, any>;
  if (!map) return 0;
  let n = 0;
  for (const [key, val] of [...map.entries()]) {
    if (matchesWhere(val, where, { store, model })) { map.delete(key); n++; }
  }
  return n;
}

function aggregate(store: MockStore, model: string, where: any, aggregates: any): any {
  const map = (store as any)[storeKey(model)] as Map<string, any>;
  if (!map) return { _count: { _all: 0 } };
  const list = [...map.values()].filter((item: any) => matchesWhere(item, where, { store, model }));
  const result: any = { _count: { _all: list.length } };
  for (const [fn, fieldsRaw] of Object.entries(aggregates)) {
    if (!fieldsRaw) continue;
    const fields: any = typeof fieldsRaw === 'string' ? { [fieldsRaw]: true } : fieldsRaw;
    if (fn === '_count') {
      const out: any = {};
      for (const field of Object.keys(fields)) out[field] = field === '_all' ? list.length : list.filter((x: any) => x[field] !== null && x[field] !== undefined).length;
      result._count = out;
      continue;
    }
    const out: any = {};
    for (const [field, enabled] of Object.entries(fields)) {
      if (!enabled) continue;
      const vals = list.map((x: any) => x[field]).filter((v: any) => typeof v === 'number');
      if (fn === '_sum') out[field] = vals.reduce((a: number, b: number) => a + b, 0);
      if (fn === '_avg') out[field] = vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
      if (fn === '_min') out[field] = vals.length ? Math.min(...vals) : null;
      if (fn === '_max') out[field] = vals.length ? Math.max(...vals) : null;
    }
    result[fn] = out;
  }
  return result;
}

function groupBy(store: MockStore, model: string, args: any): any[] {
  const map = (store as any)[storeKey(model)] as Map<string, any>;
  if (!map) return [];
  const by: string[] = Array.isArray(args?.by) ? args.by : [];
  if (by.length === 0) return [];
  let list = [...map.values()].filter((item: any) => matchesWhere(item, args.where, { store, model }));
  const groups = new Map<string, any[]>();
  for (const item of list) {
    const key = by.map((b: string) => item[b] ?? '\u0000null').join('|');
    const g = groups.get(key) ?? [];
    g.push(item);
    groups.set(key, g);
  }
  const out: any[] = [];
  for (const [rawKey, items] of groups) {
    void rawKey;
    const obj: any = {};
    by.forEach((b: string) => { obj[b] = items[0][b] ?? null; });
    // _count mirrors Prisma: `_all` counts every row; a named field counts
    // only the non-null values of that column.
    const countSpec: any = args?._count;
    if (countSpec) {
      const cnt: any = {};
      if (countSpec === true) {
        cnt._all = items.length;
      } else {
        if (countSpec._all) cnt._all = items.length;
        for (const [field, enabled] of Object.entries(countSpec)) {
          if (field === '_all' || !enabled) continue;
          cnt[field] = items.filter((x: any) => x[field] !== null && x[field] !== undefined).length;
        }
      }
      obj._count = cnt;
    }
    for (const fn of ['_avg', '_sum', '_min', '_max']) {
      const spec: any = (args as any)?.[fn];
      if (!spec || typeof spec !== 'object') continue;
      const agg: any = {};
      for (const [field, enabled] of Object.entries(spec)) {
        if (!enabled) continue;
        const vals = items.map((x: any) => x[field]).filter((v: any) => typeof v === 'number');
        if (fn === '_sum') agg[field] = vals.reduce((a: number, b: number) => a + b, 0);
        if (fn === '_avg') agg[field] = vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null;
        if (fn === '_min') agg[field] = vals.length ? Math.min(...vals) : null;
        if (fn === '_max') agg[field] = vals.length ? Math.max(...vals) : null;
      }
      obj[fn] = agg;
    }
    out.push(obj);
  }
  // `having` (Prisma's aggregate filter on grouped rows) — applied post-hoc
  // so minRating / maxRating filters keep working in mock mode.
  const having: any = args?.having;
  if (having && typeof having === 'object') {
    return out.filter((row: any) => {
      for (const [field, conds] of Object.entries(having)) {
        if (!conds || typeof conds !== 'object') continue;
        for (const [fn, params] of Object.entries(conds as Record<string, any>)) {
          if (!params || !row[fn]) continue;
          if (params.gte !== undefined && row[fn][field] < params.gte) return false;
          if (params.lte !== undefined && row[fn][field] > params.lte) return false;
          if (params.gt !== undefined && row[fn][field] <= params.gt) return false;
          if (params.lt !== undefined && row[fn][field] >= params.lt) return false;
        }
      }
      return true;
    });
  }
  if (args?.orderBy) applyOrderBy(out, args.orderBy);
  return out;
}

/* ---------- model proxy -------------------------------------- */
function modelProxy(store: MockStore, model: string): any {
  return new Proxy({}, {
    get(_target, op: string) {
      return async (args: any = {}) => {
        switch (op) {
          case 'findUnique': return findUnique(store, model, args.where, args.select, args.include);
          case 'findFirst': return findFirst(store, model, args.where, args.orderBy, args.select, args.include);
          case 'findMany': return findMany(store, model, args.where, args.orderBy, args.skip, args.take, args.select, args.include);
          case 'create': return createItem(store, model, args.data, args.select, args.include);
          case 'update': return updateItem(store, model, args.where, args.data, args.select, args.include);
          case 'upsert': return upsertItem(store, model, args.where, args.create, args.update);
          case 'delete': return deleteItem(store, model, args.where);
          case 'deleteMany': return { count: deleteMany(store, model, args.where) };
          case 'count': return count(store, model, args.where);
          case 'aggregate': return aggregate(store, model, args.where, args);
          case 'groupBy': return groupBy(store, model, args);
          case 'createMany': { const items = (args.data ?? []).map((d: any) => createItem(store, model, d)); return { count: items.length }; }
          case 'updateMany': return { count: updateMany(store, model, args.where, args.data) };
          default: return null;
        }
      };
    },
  });
}

/* ---------- transaction proxy ------------------------------- */
function txProxy(store: MockStore): any {
  return new Proxy({}, {
    get(_target, model: string) {
      return modelProxy(store, model);
    },
  });
}

/* ---------- main mock Prisma --------------------------------- */
let readyPromise: Promise<void> | null = null;

export async function ensureReady() {
  if (!readyPromise) {
    readyPromise = (async () => {
      await seedStore();
    })();
  }
  await readyPromise;
}

export function createMockPrisma(): PrismaClient {
  const store = getStore();
  const prisma = new Proxy({} as any, {
    get(_target, model: string) {
      if (model === '$connect') return async () => {};
      if (model === '$disconnect') return async () => {};
      if (model === '$transaction') return async <T>(fn: (tx: any) => T): Promise<T> => {
        return fn(txProxy(store));
      };
      if (model === '$extends') return () => prisma;
      if (model === '$on') return () => ({ unsubscribe: () => {} });
      return modelProxy(store, model);
    },
  });
  return prisma as unknown as PrismaClient;
}