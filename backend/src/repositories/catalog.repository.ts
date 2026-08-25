import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const catalogRepository = {
  // ── Grades ──────────────────────────────────────────────────────────

  findGradeById(id: string) {
    return prisma.grade.findUnique({ where: { id } });
  },

  findGradesByIds(ids: string[]) {
    return prisma.grade.findMany({ where: { id: { in: ids } } });
  },

  findManyGrades(args?: Prisma.GradeFindManyArgs) {
    return prisma.grade.findMany(args ?? { orderBy: { level: 'asc' } });
  },

  createGrade(data: Prisma.GradeCreateInput) {
    return prisma.grade.create({ data });
  },

  updateGrade(id: string, data: Prisma.GradeUpdateInput) {
    return prisma.grade.update({ where: { id }, data });
  },

  deleteGrade(id: string) {
    return prisma.grade.delete({ where: { id } });
  },

  // ── Subjects ────────────────────────────────────────────────────────

  findSubjectById(id: string) {
    return prisma.subject.findUnique({ where: { id } });
  },

  findSubjectsByIds(ids: string[]) {
    return prisma.subject.findMany({ where: { id: { in: ids } } });
  },

  findManySubjects(args?: Prisma.SubjectFindManyArgs) {
    return prisma.subject.findMany(args ?? { orderBy: { name: 'asc' } });
  },

  createSubject(data: Prisma.SubjectCreateInput) {
    return prisma.subject.create({ data });
  },

  updateSubject(id: string, data: Prisma.SubjectUpdateInput) {
    return prisma.subject.update({ where: { id }, data });
  },

  deleteSubject(id: string) {
    return prisma.subject.delete({ where: { id } });
  },

  // ── Locations ───────────────────────────────────────────────────────

  findLocationById(id: string) {
    return prisma.location.findUnique({ where: { id } });
  },

  findLocationsByCenter(centerId: string) {
    return prisma.location.findMany({ where: { centerId }, orderBy: { name: 'asc' } });
  },

  findLocationByCenterAndName(centerId: string, name: string) {
    return prisma.location.findFirst({ where: { centerId, name } });
  },

  findLocationByCenterAndNameExcluding(centerId: string, name: string, excludeId: string) {
    return prisma.location.findFirst({
      where: { centerId, name, NOT: { id: excludeId } },
    });
  },

  createLocation(data: Prisma.LocationCreateInput) {
    return prisma.location.create({ data });
  },

  updateLocation(id: string, data: Prisma.LocationUpdateInput) {
    return prisma.location.update({ where: { id }, data });
  },

  deleteLocation(id: string) {
    return prisma.location.delete({ where: { id } });
  },

  // ── Teacher-Subject join ────────────────────────────────────────────

  findTeacherSubjectsByCenter(centerId: string) {
    return prisma.teacherSubject.findMany({
      where: { teacher: { centerId } },
      select: { subject: { select: { id: true, name: true } } },
      distinct: ['subjectId'],
      take: 20,
    });
  },

  findTeacherSubjectsByCenterWithIcons(centerId: string) {
    return prisma.teacherSubject.findMany({
      where: { teacher: { centerId } },
      select: { subject: { select: { id: true, name: true, icon: true } } },
      distinct: ['subjectId'],
      take: 30,
    });
  },

  // ── Teacher-Grade join ──────────────────────────────────────────────

  findTeacherGradesByCenter(centerId: string) {
    return prisma.teacherGrade.findMany({
      where: { teacher: { centerId } },
      select: { grade: { select: { id: true, name: true } } },
      distinct: ['gradeId'],
      take: 20,
    });
  },

  findTeacherGradesByCenterExtended(centerId: string) {
    return prisma.teacherGrade.findMany({
      where: { teacher: { centerId } },
      select: { grade: { select: { id: true, name: true } } },
      distinct: ['gradeId'],
      take: 30,
    });
  },
};
