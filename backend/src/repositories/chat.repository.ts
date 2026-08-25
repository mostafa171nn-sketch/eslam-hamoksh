import { prisma } from '../lib/prisma';
import { Prisma, Role } from '@prisma/client';

export const chatRepository = {
  findTeacherByUserId(userId: string) {
    return prisma.teacher.findUnique({
      where: { userId },
      select: { id: true, centerId: true },
    });
  },

  findStudentByUserId(userId: string) {
    return prisma.student.findUnique({
      where: { userId },
      select: { id: true, centerId: true },
    });
  },

  findTeacherById(id: string) {
    return prisma.teacher.findUnique({
      where: { id },
      select: { id: true, centerId: true },
    });
  },

  findStudentById(id: string) {
    return prisma.student.findUnique({
      where: { id },
      select: { id: true, centerId: true },
    });
  },

  findTeacherStudentLink(teacherId: string, studentId: string) {
    return prisma.teacherStudent.findUnique({
      where: { teacherId_studentId: { teacherId, studentId } },
    });
  },

  findConversation(teacherId: string, studentId: string) {
    return prisma.conversation.findUnique({
      where: { teacherId_studentId: { teacherId, studentId } },
    });
  },

  findConversationById(id: string) {
    return prisma.conversation.findUnique({ where: { id } });
  },

  createConversation(data: { teacherId: string; studentId: string; centerId?: string }) {
    return prisma.conversation.create({ data });
  },

  updateConversationTimestamp(id: string) {
    return prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
  },

  findConversationsByTeacher(teacherId: string) {
    return prisma.conversation.findMany({
      where: { teacherId },
      include: {
        teacher: { include: { user: { select: { fullName: true, photo: true } } } },
        student: { include: { user: { select: { fullName: true, photo: true } } } },
        messages: { orderBy: { createdAt: 'desc' as const }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' as const },
    });
  },

  findConversationsByStudent(studentId: string) {
    return prisma.conversation.findMany({
      where: { studentId },
      include: {
        teacher: { include: { user: { select: { fullName: true, photo: true } } } },
        student: { include: { user: { select: { fullName: true, photo: true } } } },
        messages: { orderBy: { createdAt: 'desc' as const }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' as const },
    });
  },

  findConversationIdsByTeacher(teacherId: string) {
    return prisma.conversation.findMany({
      where: { teacherId },
      select: { id: true },
    });
  },

  findConversationIdsByStudent(studentId: string) {
    return prisma.conversation.findMany({
      where: { studentId },
      select: { id: true },
    });
  },

  findMessages(conversationId: string) {
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' as const },
    });
  },

  createMessage(data: Prisma.MessageCreateInput) {
    return prisma.message.create({ data });
  },

  markMessagesRead(conversationId: string, senderId: string) {
    return prisma.message.updateMany({
      where: { conversationId, senderId, read: false },
      data: { read: true },
    });
  },

  countUnread(conversationIds: string[], senderRole: any) {
    return prisma.message.count({
      where: {
        conversationId: { in: conversationIds },
        senderRole,
        read: false,
      },
    });
  },
};
