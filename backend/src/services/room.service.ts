import { ApiError } from '../utils/ApiError';
import { roomRepository } from '../repositories/room.repository';
import { centerRepository } from '../repositories/center.repository';
import type { RoomStatus } from '@prisma/client';

export interface CreateRoomInput {
  name: string;
  capacity?: number;
  floor?: string;
  building?: string;
  locationId?: string;
  status?: RoomStatus;
}

export interface UpdateRoomInput {
  name?: string;
  capacity?: number | null;
  floor?: string | null;
  building?: string | null;
  locationId?: string | null;
  status?: RoomStatus;
}

export async function createRoom(centerId: string, input: CreateRoomInput) {
  const center = await centerRepository.findById(centerId);
  if (!center) throw ApiError.notFound('Center not found.');

  const existing = await roomRepository.findByName(centerId, input.name);
  if (existing) throw ApiError.badRequest('A room with this name already exists in this center.', 'ROOM_EXISTS');

  return roomRepository.create({
    name: input.name,
    center: { connect: { id: centerId } },
    capacity: input.capacity ?? null,
    floor: input.floor ?? null,
    building: input.building ?? null,
    location: input.locationId ? { connect: { id: input.locationId } } : undefined,
    status: input.status ?? 'ACTIVE',
  });
}

export async function updateRoom(roomId: string, input: UpdateRoomInput) {
  const room = await roomRepository.findById(roomId);
  if (!room) throw ApiError.notFound('Room not found.');

  if (input.name && input.name !== room.name) {
    const existing = await roomRepository.findByName(room.centerId, input.name);
    if (existing) throw ApiError.badRequest('A room with this name already exists in this center.', 'ROOM_EXISTS');
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.capacity !== undefined) data.capacity = input.capacity;
  if (input.floor !== undefined) data.floor = input.floor;
  if (input.building !== undefined) data.building = input.building;
  if (input.locationId !== undefined) {
    data.location = input.locationId ? { connect: { id: input.locationId } } : { disconnect: true };
  }
  if (input.status !== undefined) data.status = input.status;

  return roomRepository.update(roomId, data);
}

export async function deleteRoom(roomId: string) {
  const room = await roomRepository.findById(roomId);
  if (!room) throw ApiError.notFound('Room not found.');

  const lessonCount = await roomRepository.count({
    roomId,
    status: { not: 'CANCELLED' },
  } as any);
  if (lessonCount > 0) {
    throw ApiError.badRequest('Cannot delete a room that has scheduled lessons.', 'ROOM_IN_USE');
  }

  return roomRepository.delete(roomId);
}

export async function getRoom(roomId: string) {
  const room = await roomRepository.findById(roomId);
  if (!room) throw ApiError.notFound('Room not found.');
  return room;
}

export async function listRooms(centerId: string, filters?: { status?: RoomStatus; locationId?: string }) {
  const where: any = { centerId };
  if (filters?.status) where.status = filters.status;
  if (filters?.locationId) where.locationId = filters.locationId;

  return roomRepository.findMany({
    where,
    include: { location: true },
    orderBy: { name: 'asc' },
  });
}

export async function listAvailableRooms(
  centerId: string,
  date: Date,
  startTime: string,
  endTime: string,
  excludeLessonId?: string,
) {
  const allActive = await roomRepository.findActiveByCenter(centerId);
  const booked = await roomRepository.findAvailableForLesson(centerId, date, startTime, endTime, excludeLessonId);
  const bookedIds = new Set(booked.map((r) => r.id));
  return allActive.filter((r) => !bookedIds.has(r.id));
}
