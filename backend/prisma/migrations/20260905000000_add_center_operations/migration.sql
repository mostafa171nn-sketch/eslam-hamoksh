-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('ACTIVE', 'NEEDS_ROOM', 'INACTIVE');

-- CreateEnum
CREATE TYPE "GroupEnrollmentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BookingRecurrence" AS ENUM ('ONE_TIME', 'WEEKLY');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'APPROVED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ComplaintSource" AS ENUM ('STUDENT', 'PARENT', 'TEACHER', 'EMPLOYEE', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "ComplaintSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BroadcastAudience" AS ENUM ('EMPLOYEES', 'TEACHERS', 'STUDENTS');

-- CreateEnum
CREATE TYPE "BroadcastChannel" AS ENUM ('APP', 'WHATSAPP', 'SMS');

-- CreateEnum
CREATE TYPE "BroadcastStatus" AS ENUM ('SCHEDULED', 'SENT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransportStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE');

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "stage" TEXT,
    "subjectId" TEXT,
    "teacherId" TEXT,
    "roomId" TEXT,
    "branchId" TEXT,
    "capacity" INTEGER,
    "dayOfWeek" INTEGER,
    "startTime" TEXT,
    "endTime" TEXT,
    "status" "GroupStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupEnrollment" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "GroupEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomBooking" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "groupId" TEXT,
    "date" TIMESTAMP(3),
    "dayOfWeek" INTEGER,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "recurrence" "BookingRecurrence" NOT NULL DEFAULT 'ONE_TIME',
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "code" TEXT,
    "source" "ComplaintSource" NOT NULL DEFAULT 'EXTERNAL',
    "severity" "ComplaintSeverity" NOT NULL DEFAULT 'MEDIUM',
    "score" INTEGER NOT NULL DEFAULT 0,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "reporterName" TEXT,
    "assigneeId" TEXT,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "internalAssessment" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broadcast" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "audience" "BroadcastAudience" NOT NULL DEFAULT 'EMPLOYEES',
    "channel" "BroadcastChannel" NOT NULL DEFAULT 'APP',
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "BroadcastStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportRoute" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "areas" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "vehicle" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "pickupTime" TEXT,
    "dropoffTime" TEXT,
    "status" "TransportStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportStudent" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "amount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeTask" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CenterMessage" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CenterMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Group_slug_key" ON "Group"("slug");

-- CreateIndex
CREATE INDEX "Group_centerId_idx" ON "Group"("centerId");

-- CreateIndex
CREATE INDEX "Group_teacherId_idx" ON "Group"("teacherId");

-- CreateIndex
CREATE INDEX "Group_status_idx" ON "Group"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Group_centerId_name_key" ON "Group"("centerId", "name");

-- CreateIndex
CREATE INDEX "GroupEnrollment_studentId_idx" ON "GroupEnrollment"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupEnrollment_groupId_studentId_key" ON "GroupEnrollment"("groupId", "studentId");

-- CreateIndex
CREATE INDEX "RoomBooking_centerId_idx" ON "RoomBooking"("centerId");

-- CreateIndex
CREATE INDEX "RoomBooking_roomId_dayOfWeek_idx" ON "RoomBooking"("roomId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "RoomBooking_status_idx" ON "RoomBooking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_code_key" ON "Complaint"("code");

-- CreateIndex
CREATE INDEX "Complaint_centerId_idx" ON "Complaint"("centerId");

-- CreateIndex
CREATE INDEX "Complaint_status_idx" ON "Complaint"("status");

-- CreateIndex
CREATE INDEX "Complaint_severity_idx" ON "Complaint"("severity");

-- CreateIndex
CREATE INDEX "Broadcast_centerId_idx" ON "Broadcast"("centerId");

-- CreateIndex
CREATE INDEX "Broadcast_status_idx" ON "Broadcast"("status");

-- CreateIndex
CREATE INDEX "TransportRoute_centerId_idx" ON "TransportRoute"("centerId");

-- CreateIndex
CREATE UNIQUE INDEX "TransportRoute_centerId_name_key" ON "TransportRoute"("centerId", "name");

-- CreateIndex
CREATE INDEX "TransportStudent_studentId_idx" ON "TransportStudent"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "TransportStudent_routeId_studentId_key" ON "TransportStudent"("routeId", "studentId");

-- CreateIndex
CREATE INDEX "Expense_centerId_idx" ON "Expense"("centerId");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "EmployeeTask_centerId_idx" ON "EmployeeTask"("centerId");

-- CreateIndex
CREATE INDEX "EmployeeTask_assigneeId_idx" ON "EmployeeTask"("assigneeId");

-- CreateIndex
CREATE INDEX "EmployeeTask_status_idx" ON "EmployeeTask"("status");

-- CreateIndex
CREATE INDEX "CenterMessage_centerId_idx" ON "CenterMessage"("centerId");

-- CreateIndex
CREATE INDEX "CenterMessage_recipientId_idx" ON "CenterMessage"("recipientId");

-- CreateIndex
CREATE INDEX "CenterMessage_createdAt_idx" ON "CenterMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupEnrollment" ADD CONSTRAINT "GroupEnrollment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupEnrollment" ADD CONSTRAINT "GroupEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomBooking" ADD CONSTRAINT "RoomBooking_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomBooking" ADD CONSTRAINT "RoomBooking_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomBooking" ADD CONSTRAINT "RoomBooking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomBooking" ADD CONSTRAINT "RoomBooking_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportRoute" ADD CONSTRAINT "TransportRoute_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportStudent" ADD CONSTRAINT "TransportStudent_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportStudent" ADD CONSTRAINT "TransportStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeTask" ADD CONSTRAINT "EmployeeTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeTask" ADD CONSTRAINT "EmployeeTask_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CenterMessage" ADD CONSTRAINT "CenterMessage_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CenterMessage" ADD CONSTRAINT "CenterMessage_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CenterMessage" ADD CONSTRAINT "CenterMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;