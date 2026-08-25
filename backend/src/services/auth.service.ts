import type { Role } from '@prisma/client';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../utils/password';
import { ApiError } from '../utils/ApiError';
import { hashToken, randomToken } from '../utils/tokens';
import { env } from '../config/env';
import { createRefreshToken, rotateRefreshToken, signAccessToken } from './token.service';
import { recordActivity } from './activity.service';
import { sendEmail } from './email.service';
import { assertCenterUsable, assertWithinPlanLimit, getCenterById, getCenterBySlug } from './subscription.service';
import { userRepository } from '../repositories/user.repository';
import { studentRepository } from '../repositories/student.repository';
import { parentRepository } from '../repositories/parent.repository';
import { catalogRepository } from '../repositories/catalog.repository';
import { centerRegistrationRepository } from '../repositories/center-registration.repository';

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || 'center';
}

/** Generates a collision-safe, random Student ID in the format STU-XXXXXX (6 digits). */
export async function generateStudentNumber(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const num = `STU-${String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')}`;
    const existing = await studentRepository.findByStudentNumber(num);
    if (!existing) return num;
  }
  throw ApiError.internal('Could not allocate a student number. Please try again.');
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let n = 1;
  while (await getCenterBySlug(slug)) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

export interface RegisterTeacherInput {
  fullName: string;
  username: string;
  password: string;
  phone: string;
  centerId: string;
  email?: string;
  bio?: string;
  subjects: string[];
  grades: string[];
  yearsExperience: number;
  hourlyRate: number;
  locationId?: string;
  availability: { day: number; startTime: string; endTime: string; locationId?: string }[];
}

export interface RegisterStudentInput {
  fullName: string;
  username: string;
  password: string;
  phone: string;
  centerId: string;
  email?: string;
  gradeId?: string;
  subjects: string[];
}

export interface RegisterParentInput {
  fullName: string;
  username: string;
  password: string;
  phone: string;
  centerId: string;
  email?: string;
}

export interface RegisterCenterInput {
  name: string;
  address: string;
  city: string;
  phone: string;
  email?: string;
  website?: string;
  description?: string;
  adminFullName: string;
  adminUsername: string;
  adminEmail: string;
  adminPhone: string;
  adminPassword: string;
}

const TEACHER_GRADE_IDS = async (gradeIds: string[]) => {
  const grades = await catalogRepository.findGradesByIds(gradeIds);
  const found = new Set(grades.map((g) => g.id));
  if (found.size !== gradeIds.length) {
    throw ApiError.badRequest(
      'One or more selected grades are not available. Please refresh the page and try again.',
      'UNKNOWN_GRADE',
    );
  }
  return [...found];
};

const SUBJECT_IDS = async (subjectIds: string[]) => {
  const subjects = await catalogRepository.findSubjectsByIds(subjectIds);
  const found = new Set(subjects.map((s) => s.id));
  if (found.size !== subjectIds.length) {
    throw ApiError.badRequest(
      'One or more selected subjects are not available. Please refresh the page and try again.',
      'UNKNOWN_SUBJECT',
    );
  }
  return [...found];
};

async function createUserRecord(
  role: Exclude<Role, 'SUPER_ADMIN' | 'CENTER_ADMIN'>,
  data: { username: string; password: string; fullName: string; phone: string; centerId: string; email?: string },
) {
  const existing = await userRepository.findByUsername(data.username);
  if (existing) {
    throw ApiError.conflict('This username is already taken.', 'USERNAME_TAKEN');
  }
  const passwordHash = await hashPassword(data.password);
  let phoneE164: string | null = null;
  let phoneVerified = false;
  try {
    const { normalizePhone } = await import('../utils/phone.js');
    const norm = normalizePhone(data.phone);
    phoneE164 = norm.e164;
    phoneVerified = true; // OTP-verified path normalizes; direct registration will be via OTP only
  } catch { /* keep raw */ }
  return userRepository.create({
    username: data.username,
    passwordHash,
    fullName: data.fullName,
    phone: data.phone,
    phoneE164,
    phoneVerified,
    phoneVerifiedAt: phoneVerified ? new Date() : null,
    email: data.email ?? null,
    role,
    center: { connect: { id: data.centerId } },
  });
}

/** Validates that a center can accept new registrations. */
async function assertCenterAcceptsRegistrations(centerId: string) {
  const center = await getCenterById(centerId);
  // During self-registration we only require the center to exist and be active;
  // approval gating is enforced on login/protected actions.
  if (!center) throw ApiError.notFound('Center not found.', 'CENTER_NOT_FOUND');
  if (center.status !== 'ACTIVE') {
    throw ApiError.forbidden('This center is not accepting registrations.', 'CENTER_INACTIVE');
  }
  return center;
}

export async function registerTeacher(input: RegisterTeacherInput) {
  await assertCenterAcceptsRegistrations(input.centerId);
  await assertWithinPlanLimit(input.centerId, 'teachers');

  const user = await createUserRecord('TEACHER', {
    username: input.username,
    password: input.password,
    fullName: input.fullName,
    phone: input.phone,
    email: input.email,
    centerId: input.centerId,
  });

  const subjectIds = await SUBJECT_IDS(input.subjects);
  const gradeIds = await TEACHER_GRADE_IDS(input.grades);

  const teacher = await prisma.$transaction(async (tx) => {
    const t = await tx.teacher.create({
      data: {
        userId: user.id,
        centerId: input.centerId,
        bio: input.bio,
        yearsExperience: input.yearsExperience,
        hourlyRate: input.hourlyRate,
        locationId: input.locationId || null,
        subjects: { create: subjectIds.map((subjectId) => ({ subjectId })) },
        grades: { create: gradeIds.map((gradeId) => ({ gradeId })) },
        availability: {
          create: (input.availability ?? []).map((a) => ({
            day: a.day,
            startTime: a.startTime,
            endTime: a.endTime,
            locationId: a.locationId || input.locationId || null,
          })),
        },
      },
    });
    return t;
  });

  await recordActivity({
    userId: user.id,
    role: 'TEACHER',
    action: 'registered',
    entity: 'Teacher',
    entityId: teacher.id,
  });

  return { user, teacherId: teacher.id };
}

export async function registerStudent(input: RegisterStudentInput) {
  await assertCenterAcceptsRegistrations(input.centerId);
  await assertWithinPlanLimit(input.centerId, 'students');

  const user = await createUserRecord('STUDENT', {
    username: input.username,
    password: input.password,
    fullName: input.fullName,
    phone: input.phone,
    email: input.email,
    centerId: input.centerId,
  });

  const subjectIds = await SUBJECT_IDS(input.subjects);
  const studentNumber = await generateStudentNumber();

  const student = await studentRepository.create({
    user: { connect: { id: user.id } },
    center: { connect: { id: input.centerId } },
    studentNumber,
    grade: input.gradeId ? { connect: { id: input.gradeId } } : undefined,
    studentSubjects: { create: subjectIds.map((subjectId) => ({ subjectId })) },
  });

  await recordActivity({
    userId: user.id,
    role: 'STUDENT',
    action: 'registered',
    entity: 'Student',
    entityId: student.id,
  });

  return { user, studentId: student.id, studentNumber };
}

export async function registerParent(input: RegisterParentInput) {
  await assertCenterAcceptsRegistrations(input.centerId);

  const user = await createUserRecord('PARENT', {
    username: input.username,
    password: input.password,
    fullName: input.fullName,
    phone: input.phone,
    email: input.email,
    centerId: input.centerId,
  });

  const parent = await parentRepository.create({ user: { connect: { id: user.id } }, center: input.centerId ? { connect: { id: input.centerId } } : undefined } as any);

  await recordActivity({
    userId: user.id,
    role: 'PARENT',
    action: 'registered',
    entity: 'Parent',
    entityId: parent.id,
  });

  return { user, parentId: parent.id };
}

/**
 * Registers a new education center (tenant) together with its CENTER_ADMIN
 * account. The center is created in PENDING state and requires SUPER_ADMIN
 * approval before it can be used, per the SaaS business model.
 */
export async function registerCenter(input: RegisterCenterInput) {
  const existingUser = await userRepository.findByUsername(input.adminUsername);
  if (existingUser) {
    throw ApiError.conflict('This administrator username is already taken.', 'USERNAME_TAKEN');
  }

  const slug = await uniqueSlug(input.name);
  const plan = await prisma.subscriptionPlan.findFirst({
    where: { isActive: true },
    orderBy: { priceMonthly: 'asc' },
  });

  const passwordHash = await hashPassword(input.adminPassword);

  // Normalize phones to E.164 so OTP verification can mark them verified
  let centerPhoneE164: string | null = null;
  let adminPhoneE164: string | null = null;
  let adminPhoneVerified = false;
  try {
    const { normalizePhone: np } = await import('../utils/phone.js');
    if (input.phone) {
      try {
        centerPhoneE164 = np(input.phone).e164;
      } catch {}
    }
    if (input.adminPhone) {
      const norm = np(input.adminPhone);
      adminPhoneE164 = norm.e164;
      adminPhoneVerified = true;
    }
  } catch {}

  const result = await prisma.$transaction(async (tx) => {
    const center = await tx.center.create({
      data: {
        name: input.name,
        slug,
        address: input.address,
        city: input.city,
        phone: centerPhoneE164 ?? input.phone,
        email: input.email,
        website: input.website,
        description: input.description,
        status: 'PENDING',
        subscriptionStatus: 'PENDING',
        requiresApproval: true,
        planId: plan?.id ?? null,
      },
    });

    const user = await tx.user.create({
      data: {
        username: input.adminUsername,
        passwordHash,
        fullName: input.adminFullName,
        phone: input.adminPhone,
        phoneE164: adminPhoneE164,
        phoneVerified: adminPhoneVerified,
        phoneVerifiedAt: adminPhoneVerified ? new Date() : null,
        email: input.adminEmail,
        role: 'CENTER_ADMIN',
        status: 'PENDING',
        centerId: center.id,
      },
    });

    await tx.centerSettings.create({
      data: {
        centerId: center.id,
        name: input.name,
        timezone: 'Africa/Cairo',
        currency: plan?.currency ?? 'EGP',
      },
    });

    // Create a registration request for SUPER_ADMIN review
    await tx.centerRegistrationRequest.create({
      data: {
        centerId: center.id,
        requesterId: user.id,
        status: 'PENDING',
      },
    });

    return { center, userId: user.id };
  });

  await recordActivity({
    userId: result.userId,
    role: 'CENTER_ADMIN',
    action: 'registered_center',
    entity: 'Center',
    entityId: result.center.id,
  });

  return result;
}

export interface LoginResult {
  userId: string;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const user = await userRepository.findFirst({ username });
  if (!user) {
    throw ApiError.unauthorized('Invalid username or password.');
  }
  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    throw ApiError.unauthorized('Invalid username or password.');
  }
  if (user.status !== 'ACTIVE') {
    throw ApiError.forbidden(
      'Your account is not active. Please contact the administration.',
      'ACCOUNT_INACTIVE',
    );
  }

  const accessToken = signAccessToken(user.id, user.role);
  const { token: refreshToken, expiresAt } = await createRefreshToken(user.id);

  await recordActivity({ userId: user.id, role: user.role, action: 'logged_in', entity: 'User' });

  return { userId: user.id, accessToken, refreshToken, refreshExpiresAt: expiresAt };
}

export async function refreshSession(userId: string, role: string, oldRefreshToken: string) {
  const { token: newRefresh, expiresAt } = await rotateRefreshToken(userId, oldRefreshToken);
  const accessToken = signAccessToken(userId, role);
  return { accessToken, refreshToken: newRefresh, refreshExpiresAt: expiresAt };
}

export async function forgotPassword(usernameOrEmail: string) {
  const user = await userRepository.findFirst({
    OR: [{ username: usernameOrEmail }, { email: usernameOrEmail.toLowerCase() }],
  });

  // Generic response to prevent account enumeration.
  if (!user) return null;

  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await userRepository.createPasswordResetToken({
    user: { connect: { id: user.id } },
    tokenHash: hashToken(token),
    expiresAt,
  });

  const resetUrl = `${env.appUrl}/auth/reset-password?token=${token}`;
  await sendEmail({
    to: user.email ?? '',
    subject: 'Reset your password',
    text: `You requested a password reset for your Educational Center account.

Reset your password here (valid for 1 hour):
${resetUrl}

If you did not request this, you can safely ignore this email.`,
  });

  return { token, resetUrl };
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = hashToken(token);
  const record = await userRepository.findPasswordResetTokenByHash(tokenHash);

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw ApiError.badRequest(
      'This password reset link is invalid or has expired.',
      'INVALID_RESET_TOKEN',
    );
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await tx.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    await tx.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });

  await recordActivity({
    userId: record.userId,
    action: 'reset_password',
    entity: 'User',
    details: 'Password reset completed',
  });
}
