-- AlterEnum
ALTER TYPE "WorkflowStage" ADD VALUE 'EARLY_SKIP';

-- AlterTable
ALTER TABLE "workflow_runs" ADD COLUMN "skip_reason" TEXT, ADD COLUMN "completion_reason" TEXT;
