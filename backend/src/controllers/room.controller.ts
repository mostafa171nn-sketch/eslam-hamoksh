import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';
import { currentCenterId } from '../lib/tenant';
import { ApiError } from '../utils/ApiError';
import {
  createRoom,
  updateRoom,
  deleteRoom,
  getRoom,
  listRooms,
  listAvailableRooms,
} from '../services/room.service';

export const createRoomHandler = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.badRequest('No center context.');
  const body = req.validatedBody ?? req.body;
  const room = await createRoom(centerId, body);
  return created(res, room, 'Room created.');
});

export const updateRoomHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validatedBody ?? req.body;
  const room = await updateRoom(req.params.id, body);
  return ok(res, room, 'Room updated.');
});

export const deleteRoomHandler = asyncHandler(async (req: Request, res: Response) => {
  await deleteRoom(req.params.id);
  return ok(res, null, 'Room deleted.');
});

export const getRoomHandler = asyncHandler(async (req: Request, res: Response) => {
  const room = await getRoom(req.params.id);
  return ok(res, room, 'Room loaded.');
});

export const listRoomsHandler = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.badRequest('No center context.');
  const { status, locationId } = req.query;
  const rooms = await listRooms(centerId, {
    status: status as any,
    locationId: locationId as string | undefined,
  });
  return ok(res, rooms, 'Rooms loaded.');
});

export const listAvailableRoomsHandler = asyncHandler(async (req: Request, res: Response) => {
  const centerId = currentCenterId();
  if (!centerId) throw ApiError.badRequest('No center context.');
  const { date, startTime, endTime, excludeLessonId } = req.query;
  if (!date || !startTime || !endTime) {
    throw ApiError.badRequest('date, startTime, and endTime are required.');
  }
  const rooms = await listAvailableRooms(
    centerId,
    new Date(date as string),
    startTime as string,
    endTime as string,
    excludeLessonId as string | undefined,
  );
  return ok(res, rooms, 'Available rooms loaded.');
});
