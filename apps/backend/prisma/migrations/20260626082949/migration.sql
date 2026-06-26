/*
  Warnings:

  - The values [CLONING,ANALYZING,WRITING,REVIEWING,AWAITING_REVIEW,CREATING_PR,REJECTED] on the enum `RunStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "WorkflowStage" AS ENUM ('CLONING', 'ANALYZING', 'LOCATING_DOCUMENTATION', 'WRITING', 'REVIEWING', 'CREATING_PULL_REQUEST', 'FINISHED');

-- AlterEnum
BEGIN;
CREATE TYPE "RunStatus_new" AS ENUM ('QUEUED', 'RUNNING', 'CHECKPOINTED', 'COMPLETED', 'FAILED', 'CANCELLED');
ALTER TABLE "public"."workflow_runs" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "workflow_runs" ALTER COLUMN "status" TYPE "RunStatus_new" USING ("status"::text::"RunStatus_new");
ALTER TYPE "RunStatus" RENAME TO "RunStatus_old";
ALTER TYPE "RunStatus_new" RENAME TO "RunStatus";
DROP TYPE "public"."RunStatus_old";
ALTER TABLE "workflow_runs" ALTER COLUMN "status" SET DEFAULT 'QUEUED';
COMMIT;

-- AlterTable
ALTER TABLE "workflow_runs" ADD COLUMN     "checkpoint_snapshot" JSONB,
ADD COLUMN     "current_node" TEXT,
ADD COLUMN     "current_stage" "WorkflowStage",
ADD COLUMN     "execution_metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "last_error" JSONB,
ADD COLUMN     "node_retries" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;
