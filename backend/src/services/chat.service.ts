import { chatRepository } from '../repositories/chat.repository';
import { ApiError } from '../utils/ApiError';
import type { Role } from '@prisma/client';

interface Actor {
  id: string;
  role: Role;
}

async function resolveActorIds(actor: Actor) {
  if (actor.role === 'TEACHER') {
    const t = await chatRepository.findTeacherByUserId(actor.id);
    if (!t) throw ApiError.notFound('Teacher profile not found.');
    return { teacherId: t.id, studentId: null, centerId: t.centerId };
  }
  if (actor.role === 'STUDENT') {
    const s = await chatRepository.findStudentByUserId(actor.id);
    if (!s) throw ApiError.notFound('Student profile not found.');
    return { teacherId: null, studentId: s.id, centerId: s.centerId };
  }
  throw ApiError.forbidden('Only teachers and students can use chat.', 'ROLE_FORBIDDEN');
}

/**
 * Returns (creating if necessary) a conversation between a teacher and student,
 * but only when they are actually linked through an enrollment/lesson
 * relationship within the same center. Prevents arbitrary messaging.
 */
export async function getOrCreateConversation(actor: Actor, counterpartId: string) {
  const me = await resolveActorIds(actor);

  let teacherId: string;
  let studentId: string;

  if (actor.role === 'TEACHER') {
    teacherId = me.teacherId!;
    const student = await chatRepository.findStudentById(counterpartId);
    if (!student) throw ApiError.notFound('Student not found.');
    if (student.centerId !== me.centerId) throw ApiError.forbidden('This student belongs to another center.', 'TENANT_MISMATCH');
    studentId = student.id;
  } else {
    studentId = me.studentId!;
    const teacher = await chatRepository.findTeacherById(counterpartId);
    if (!teacher) throw ApiError.notFound('Teacher not found.');
    if (teacher.centerId !== me.centerId) throw ApiError.forbidden('This teacher belongs to another center.', 'TENANT_MISMATCH');
    teacherId = teacher.id;
  }

  const linked = await chatRepository.findTeacherStudentLink(teacherId, studentId);
  if (!linked) {
    throw ApiError.forbidden(
      'You can only message teachers or students you are enrolled with.',
      'NOT_LINKED',
    );
  }

  const existing = await chatRepository.findConversation(teacherId, studentId);
  if (existing) return existing;

  return chatRepository.createConversation({ teacherId, studentId, centerId: me.centerId ?? undefined });
}

export async function listConversations(actor: Actor) {
  const me = await resolveActorIds(actor);

  const conversations = actor.role === 'TEACHER'
    ? await chatRepository.findConversationsByTeacher(me.teacherId!)
    : await chatRepository.findConversationsByStudent(me.studentId!);

  return conversations.map((c) => ({
    id: c.id,
    teacher: { id: c.teacher.id, name: c.teacher.user.fullName, photo: c.teacher.user.photo },
    student: { id: c.student.id, name: c.student.user.fullName, photo: c.student.user.photo },
    lastMessage: c.messages[0] ?? null,
  }));
}

export async function getMessages(actor: Actor, conversationId: string) {
  const me = await resolveActorIds(actor);
  const conversation = await chatRepository.findConversationById(conversationId);
  if (!conversation) throw ApiError.notFound('Conversation not found.');
  if (actor.role === 'TEACHER' && conversation.teacherId !== me.teacherId) {
    throw ApiError.forbidden('You do not have access to this conversation.', 'FORBIDDEN');
  }
  if (actor.role === 'STUDENT' && conversation.studentId !== me.studentId) {
    throw ApiError.forbidden('You do not have access to this conversation.', 'FORBIDDEN');
  }

  const messages = await chatRepository.findMessages(conversationId);

  const otherSenderId = actor.role === 'TEACHER' ? conversation.studentId : conversation.teacherId;
  await chatRepository.markMessagesRead(conversationId, otherSenderId);

  return messages;
}

export async function sendMessage(actor: Actor, conversationId: string, body: string) {
  const me = await resolveActorIds(actor);
  const conversation = await chatRepository.findConversationById(conversationId);
  if (!conversation) throw ApiError.notFound('Conversation not found.');
  if (actor.role === 'TEACHER' && conversation.teacherId !== me.teacherId) {
    throw ApiError.forbidden('You do not have access to this conversation.', 'FORBIDDEN');
  }
  if (actor.role === 'STUDENT' && conversation.studentId !== me.studentId) {
    throw ApiError.forbidden('You do not have access to this conversation.', 'FORBIDDEN');
  }

  const message = await chatRepository.createMessage({
    conversation: { connect: { id: conversationId } },
    senderId: actor.id,
    senderRole: actor.role,
    body,
  });

  await chatRepository.updateConversationTimestamp(conversationId);

  return message;
}

export async function unreadCount(actor: Actor) {
  const me = await resolveActorIds(actor);
  if (actor.role === 'TEACHER') {
    const convs = await chatRepository.findConversationIdsByTeacher(me.teacherId!);
    const ids = convs.map((c) => c.id);
    if (!ids.length) return 0;
    return chatRepository.countUnread(ids, 'STUDENT');
  }
  const convs = await chatRepository.findConversationIdsByStudent(me.studentId!);
  const ids = convs.map((c) => c.id);
  if (!ids.length) return 0;
  return chatRepository.countUnread(ids, 'TEACHER');
}
