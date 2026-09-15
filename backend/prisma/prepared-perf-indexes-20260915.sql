-- =============================================================================
-- PREPARED ONLY — NOT APPLIED. DO NOT RUN WITHOUT EXPLICIT APPROVAL.
--
-- Phase 4 database index recommendations (PostgreSQL / Neon).
-- Review in the Phase 4 report first. Apply manually with psql /
-- `prisma db execute` — this file must NOT be dropped into prisma/migrations/
-- because `prisma migrate deploy` would execute it automatically.
--
-- Current dev volume is tiny (75 users, 11 teachers, 12 centers, ~15 ratings),
-- so these indexes are run-rate optimizations for production scale, not for
-- today's dataset. They never change query SEMANTICS, only speed.
-- =============================================================================

-- 1) Trigram extension for ILIKE '%...%' public text search.
--    On Neon, the DB role may not be able to create extensions; may require
--    dashboard/superuser. b-tree indexes CANNOT serve middle-of-string ILIKE,
--    so pg_trgm GIN is the only real lever for name/city substring search.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2) Public center listing = the dominant anonymous query:
--      WHERE status='ACTIVE' AND subscriptionStatus='ACTIVE'
--      ORDER BY "createdAt" DESC  LIMIT <page>
--    Composite index where the two equality filters lead, then createdAt DESC
--    finishes the top-N without a sort. High value at scale.
CREATE INDEX IF NOT EXISTS "Center_status_subscriptionStatus_createdAt_idx"
  ON "Center" ("status", "subscriptionStatus", "createdAt" DESC);

-- 3) Admin/user-module list: WHERE role IN (...) AND status = ... is a common
--    combined filter (admin user lists, counts). Medium value.
CREATE INDEX IF NOT EXISTS "User_status_role_idx"
  ON "User" ("status", "role");

-- 4) Teacher search by name uses  user: { fullName: { contains, mode:
--    insensitive } }  → SQL ILIKE '%...%'. A b-tree on User(fullName) is
--    useless for partial matches; only trigrams help. This is the correct
--    replacement for the "User(status, fullName)" idea — that composite b-tree
--    was intentionally NOT recommended (it cannot accelerate '%x%').
CREATE INDEX IF NOT EXISTS "User_fullName_trgm_idx"
  ON "User" USING GIN ("fullName" gin_trgm_ops);

-- 5) Center q-search scans name/city/address with the same ILIKE '%x%'
--    semantics (listCenters OR branch). Same trigram treatment.
CREATE INDEX IF NOT EXISTS "Center_name_trgm_idx"
  ON "Center" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Center_city_trgm_idx"
  ON "Center" USING GIN ("city" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Center_address_trgm_idx"
  ON "Center" USING GIN ("address" gin_trgm_ops);