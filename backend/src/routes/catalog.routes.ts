import { Router, type Request, type Response, type NextFunction } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import { listGrades, listPublicLocations, listSubjects } from '../services/admin.service';
import { publicDiscoveryRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Reference data (grades / subjects / locations) is static and safe to cache.
// Conservative `public` header keeps the client-side catalog cache working and
// lets proxies revalidate conditionally (Express auto-ETag + 304).
const cacheReferenceData = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
  next();
};

router.use(publicDiscoveryRateLimiter);
router.use(cacheReferenceData);

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
  asyncHandler(async (_req, res) => ok(res, await listPublicLocations(), 'Locations loaded.')),
);

export default router;
