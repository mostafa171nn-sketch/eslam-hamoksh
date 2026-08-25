import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { listGrades, listLocations, listSubjects } from '../services/admin.service';

const router = Router();

router.get(
  '/subjects',
  asyncHandler(async (_req, res) => ok(res, await listSubjects(), 'Subjects loaded.')),
);

router.get(
  '/grades',
  asyncHandler(async (_req, res) => ok(res, await listGrades(), 'Grades loaded.')),
);

router.get(
  '/locations',
  asyncHandler(async (_req, res) => ok(res, await listLocations(), 'Locations loaded.')),
);

export default router;
