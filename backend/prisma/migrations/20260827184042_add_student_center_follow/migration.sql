-- DropForeignKey
ALTER TABLE "Parent" DROP CONSTRAINT "Parent_centerId_fkey";

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_centerId_fkey";

-- DropForeignKey
ALTER TABLE "Teacher" DROP CONSTRAINT "Teacher_centerId_fkey";

-- CreateTable
CREATE TABLE "StudentCenterFollow" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentCenterFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentCenterFollow_studentId_idx" ON "StudentCenterFollow"("studentId");

-- CreateIndex
CREATE INDEX "StudentCenterFollow_centerId_idx" ON "StudentCenterFollow"("centerId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentCenterFollow_studentId_centerId_key" ON "StudentCenterFollow"("studentId", "centerId");

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCenterFollow" ADD CONSTRAINT "StudentCenterFollow_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCenterFollow" ADD CONSTRAINT "StudentCenterFollow_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
