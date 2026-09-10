-- AlterEnum
ALTER TYPE "ComplaintStatus" ADD VALUE 'WAITING_CUSTOMER';

-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN "internalNotes" TEXT;