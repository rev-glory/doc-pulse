-- AlterEnum
ALTER TYPE "RunStatus" ADD VALUE 'WAITING_FOR_REVIEW';

-- DropIndex
DROP INDEX "reviews_workflow_run_id_key";

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "metrics" JSONB;

-- AlterTable
ALTER TABLE "workflow_runs" ADD COLUMN     "current_review_id" TEXT;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_current_review_id_fkey" FOREIGN KEY ("current_review_id") REFERENCES "reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create manual PostgreSQL partial unique index unique_pending_review_per_run
CREATE UNIQUE INDEX unique_pending_review_per_run
ON reviews(workflow_run_id)
WHERE status = 'PENDING';
