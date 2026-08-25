-- P2 Security & Architecture Fixes Migration
-- 1. ActivityLog: add centerId column + index
-- 2. Missing indexes on Rating, Lesson, Exam, Assignment
-- 3. RolePermission.role: String → Role enum
-- 4. Center cascade delete safety: Teacher/Student/Parent center → SetNull

-- ============================================================
-- 1. ActivityLog centerId
-- ============================================================
ALTER TABLE "ActivityLog" ADD COLUMN "centerId" TEXT;

CREATE INDEX "ActivityLog_centerId_idx" ON "ActivityLog"("centerId");

-- ============================================================
-- 2. Missing indexes
-- ============================================================
CREATE INDEX "Rating_studentId_idx" ON "Rating"("studentId");
CREATE INDEX "Rating_parentId_idx" ON "Rating"("parentId");
CREATE INDEX "Lesson_subjectId_idx" ON "Lesson"("subjectId");
CREATE INDEX "Exam_subjectId_idx" ON "Exam"("subjectId");
CREATE INDEX "Assignment_subjectId_idx" ON "Assignment"("subjectId");

-- ============================================================
-- 3. RolePermission.role: String → Role enum
-- ============================================================
-- Create the Role enum type if it doesn't exist
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM (
    'SUPER_ADMIN', 'CENTER_ADMIN', 'CENTER_EMPLOYEE', 'RECEPTIONIST',
    'TEACHER', 'TEACHER_ASSISTANT', 'STUDENT', 'PARENT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Drop the old composite primary key
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_pkey";

-- Add a temporary column with enum type
ALTER TABLE "RolePermission" ADD COLUMN "roleEnum" "Role";
UPDATE "RolePermission" SET "roleEnum" = "role"::"Role";
ALTER TABLE "RolePermission" DROP COLUMN "role";
ALTER TABLE "RolePermission" RENAME COLUMN "roleEnum" TO "role";

-- Re-create the composite primary key
ALTER TABLE "RolePermission" ADD PRIMARY KEY ("role", "permissionId");

-- ============================================================
-- 4. Center cascade delete safety
-- Teacher.center, Student.center, Parent.center: Cascade → SetNull
-- ============================================================
ALTER TABLE "Teacher" DROP CONSTRAINT "Teacher_centerId_fkey";
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_centerId_fkey"
  FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE SET NULL;

ALTER TABLE "Student" DROP CONSTRAINT "Student_centerId_fkey";
ALTER TABLE "Student" ADD CONSTRAINT "Student_centerId_fkey"
  FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE SET NULL;

ALTER TABLE "Parent" DROP CONSTRAINT "Parent_centerId_fkey";
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_centerId_fkey"
  FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE SET NULL;
