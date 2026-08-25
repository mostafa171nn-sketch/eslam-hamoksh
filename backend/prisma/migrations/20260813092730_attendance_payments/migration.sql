/*
  Warnings:

  - Added the required column `updatedAt` to the `Attendance` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AttendanceMethod" AS ENUM ('QR', 'MANUAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('SESSION', 'MONTHLY');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('VODAFONE_CASH', 'ETISALAT_CASH', 'ORANGE_CASH', 'INSTAPAY', 'TELDA');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'REJECTED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "method" "AttendanceMethod" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "AttendanceQrSession" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "AttendanceQrSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CenterSettings" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "name" TEXT NOT NULL DEFAULT 'Main Center',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "radiusMeters" INTEGER NOT NULL DEFAULT 100,
    "attendanceGraceMinutes" INTEGER NOT NULL DEFAULT 10,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Cairo',
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CenterSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherPaymentSettings" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "sessionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "monthlyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sessionPrice" INTEGER NOT NULL DEFAULT 0,
    "monthlyPrice" INTEGER NOT NULL DEFAULT 0,
    "vodafoneCash" TEXT,
    "etisalatCash" TEXT,
    "orangeCash" TEXT,
    "instaPay" TEXT,
    "telda" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherPaymentSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentId" TEXT,
    "teacherId" TEXT NOT NULL,
    "monthlyPrice" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod",
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "payerName" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentId" TEXT,
    "teacherId" TEXT NOT NULL,
    "lessonId" TEXT,
    "subscriptionId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "type" "PaymentType" NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionReference" TEXT,
    "proofUrl" TEXT,
    "rejectionReason" TEXT,
    "approvedById" TEXT,
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "refundAmount" INTEGER,
    "refundReason" TEXT,
    "refundedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentStatusHistory" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "oldStatus" "PaymentStatus",
    "newStatus" "PaymentStatus" NOT NULL,
    "changedById" TEXT,
    "changedByName" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceQrSession_tokenHash_key" ON "AttendanceQrSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AttendanceQrSession_studentId_idx" ON "AttendanceQrSession"("studentId");

-- CreateIndex
CREATE INDEX "AttendanceQrSession_lessonId_idx" ON "AttendanceQrSession"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherPaymentSettings_teacherId_key" ON "TeacherPaymentSettings"("teacherId");

-- CreateIndex
CREATE INDEX "Subscription_studentId_idx" ON "Subscription"("studentId");

-- CreateIndex
CREATE INDEX "Subscription_teacherId_idx" ON "Subscription"("teacherId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paymentNumber_key" ON "Payment"("paymentNumber");

-- CreateIndex
CREATE INDEX "Payment_payerId_idx" ON "Payment"("payerId");

-- CreateIndex
CREATE INDEX "Payment_studentId_idx" ON "Payment"("studentId");

-- CreateIndex
CREATE INDEX "Payment_parentId_idx" ON "Payment"("parentId");

-- CreateIndex
CREATE INDEX "Payment_teacherId_idx" ON "Payment"("teacherId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_method_idx" ON "Payment"("method");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "Payment_paymentNumber_idx" ON "Payment"("paymentNumber");

-- CreateIndex
CREATE INDEX "PaymentStatusHistory_paymentId_idx" ON "PaymentStatusHistory"("paymentId");

-- CreateIndex
CREATE INDEX "Attendance_lessonId_idx" ON "Attendance"("lessonId");

-- CreateIndex
CREATE INDEX "Attendance_status_idx" ON "Attendance"("status");

-- CreateIndex
CREATE INDEX "Attendance_markedAt_idx" ON "Attendance"("markedAt");

-- AddForeignKey
ALTER TABLE "AttendanceQrSession" ADD CONSTRAINT "AttendanceQrSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceQrSession" ADD CONSTRAINT "AttendanceQrSession_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentStatusHistory" ADD CONSTRAINT "PaymentStatusHistory_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
