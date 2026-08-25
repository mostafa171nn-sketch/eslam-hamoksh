import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(__dirname, '../../src');
const SERVICES_DIR = path.join(SRC_DIR, 'services');

/**
 * Architecture compliance test: ensures no service file imports prisma
 * directly from '../lib/prisma'. Services should only access data through
 * repository files.
 *
 * Known legacy violations (services that predate the repository pattern):
 * admin.service.ts, assignment.service.ts, attendance.service.ts,
 * auth.service.ts, exam.service.ts, lesson.service.ts, parent.service.ts,
 * payment.service.ts, rating.service.ts, report.service.ts,
 * session.service.ts, student.service.ts, teacher.service.ts,
 * teacher-assistant.service.ts, user.service.ts, wallet.service.ts
 *
 * wallet.service.ts requires direct prisma access for $transaction/$queryRaw
 * (SELECT … FOR UPDATE) to prevent concurrent balance corruption.
 *
 * These are tracked as technical debt and must be migrated to repositories
 * in a future refactoring phase.
 */
describe('Architecture Compliance: No direct prisma imports in services', () => {
  const serviceFiles = fs.readdirSync(SERVICES_DIR).filter((f) => f.endsWith('.ts'));

  const KNOWN_VIOLATIONS = new Set([
    'admin.service.ts',
    'assignment.service.ts',
    'attendance.service.ts',
    'auth.service.ts',
    'exam.service.ts',
    'lesson.service.ts',
    'parent.service.ts',
    'payment.service.ts',
    'rating.service.ts',
    'report.service.ts',
    'session.service.ts',
    'student.service.ts',
    'teacher.service.ts',
    'teacher-assistant.service.ts',
    'user.service.ts',
    'wallet.service.ts',
  ]);

  for (const file of serviceFiles) {
    const isKnownViolation = KNOWN_VIOLATIONS.has(file);
    it(`${file} should not import prisma directly${isKnownViolation ? ' (KNOWN VIATION)' : ''}`, () => {
      const content = fs.readFileSync(path.join(SERVICES_DIR, file), 'utf-8');
      const hasDirectPrismaImport =
        /import\s+.*\bprisma\b.*from\s+['"]\.\.\/(lib\/prisma|\.\/prisma)/.test(content) ||
        /import\s*\{[^}]*\bprisma\b[^}]*\}\s*from\s+['"]\.\.\/(lib\/prisma|\.\/prisma)/.test(content);
      if (isKnownViolation) {
        // Known legacy violation - test passes but documents the tech debt
        assert.ok(hasDirectPrismaImport, `${file} is a known legacy violation`);
      } else {
        assert.equal(
          hasDirectPrismaImport,
          false,
          `${file} contains a direct prisma import. Services must use repositories.`,
        );
      }
    });
  }
});

/**
 * Architecture compliance: ensures all controller files use asyncHandler.
 */
describe('Architecture Compliance: Controllers use asyncHandler', () => {
  const CONTROLLERS_DIR = path.join(SRC_DIR, 'controllers');
  const controllerFiles = fs.readdirSync(CONTROLLERS_DIR).filter((f) => f.endsWith('.ts'));

  for (const file of controllerFiles) {
    it(`${file} should import asyncHandler`, () => {
      const content = fs.readFileSync(path.join(CONTROLLERS_DIR, file), 'utf-8');
      const hasAsyncHandler = /import.*asyncHandler.*from/.test(content);
      // Some controllers like notification-template.routes.ts don't have traditional controllers
      // but the main ones should
      if (!file.includes('notification-template')) {
        assert.ok(hasAsyncHandler, `${file} should import asyncHandler`);
      }
    });
  }
});

/**
 * Architecture compliance: ensures all routes use authenticate middleware.
 * Exception: catalog.routes.ts is intentionally public (subject/grade listings).
 */
describe('Architecture Compliance: Routes use authenticate', () => {
  const ROUTES_DIR = path.join(SRC_DIR, 'routes');
  const routeFiles = fs.readdirSync(ROUTES_DIR).filter((f) => f.endsWith('.ts'));

  const PUBLIC_ROUTES = new Set(['catalog.routes.ts']);

  for (const file of routeFiles) {
    if (PUBLIC_ROUTES.has(file)) continue;
    it(`${file} should import authenticate`, () => {
      const content = fs.readFileSync(path.join(ROUTES_DIR, file), 'utf-8');
      const hasAuth = /import.*authenticate.*from/.test(content) || /router\.use\(authenticate/.test(content);
      assert.ok(hasAuth, `${file} should use authenticate middleware`);
    });
  }
});

/**
 * Architecture compliance: ensure all repositories import prisma
 * (this is the correct place for it).
 */
describe('Architecture Compliance: All repositories import prisma', () => {
  const REPOS_DIR = path.join(SRC_DIR, 'repositories');
  const repoFiles = fs.readdirSync(REPOS_DIR).filter((f) => f.endsWith('.ts'));

  for (const file of repoFiles) {
    it(`${file} should import from lib/prisma`, () => {
      const content = fs.readFileSync(path.join(REPOS_DIR, file), 'utf-8');
      const hasPrismaImport = /import.*from\s+['"]\.\.\/(lib\/prisma|\.\/prisma)/.test(content) ||
        /import.*from\s+['"]\.\.\/\.\.\/lib\/prisma/.test(content);
      assert.ok(hasPrismaImport, `${file} should import prisma from lib/prisma`);
    });
  }
});
