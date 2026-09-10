-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'OPERATIONS';
ALTER TABLE "ActivityLog" ADD COLUMN "result" TEXT NOT NULL DEFAULT 'SUCCESS';

-- CreateIndex
CREATE INDEX "ActivityLog_category_idx" ON "ActivityLog"("category");
CREATE INDEX "ActivityLog_result_idx" ON "ActivityLog"("result");

-- AlterTable
ALTER TABLE "CenterSettings" ADD COLUMN "navOrder" JSONB;
ALTER TABLE "CenterSettings" ADD COLUMN "hiddenPages" JSONB;
ALTER TABLE "CenterSettings" ADD COLUMN "escalation" JSONB;
ALTER TABLE "CenterSettings" ADD COLUMN "comparisonMode" TEXT NOT NULL DEFAULT 'LAST_MONTH';