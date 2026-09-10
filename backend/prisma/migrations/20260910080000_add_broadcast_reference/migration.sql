-- AlterEnum
ALTER TYPE "BroadcastAudience" ADD VALUE 'PARENTS';

-- AlterEnum
ALTER TYPE "BroadcastAudience" ADD VALUE 'GROUP';

-- AlterEnum
ALTER TYPE "BroadcastStatus" ADD VALUE 'DRAFT';

-- AlterTable
ALTER TABLE "Broadcast" ADD COLUMN "groupId" TEXT,
ADD COLUMN "groupName" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "broadcastId" TEXT;

-- CreateIndex
CREATE INDEX "Notification_broadcastId_idx" ON "Notification"("broadcastId");