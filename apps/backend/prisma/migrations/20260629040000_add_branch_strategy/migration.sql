-- CreateEnum
CREATE TYPE "BranchStrategy" AS ENUM ('CURRENT_BRANCH', 'DOCUMENTATION_BRANCH');

-- AlterTable
ALTER TABLE "repositories" ADD COLUMN "branch_strategy" "BranchStrategy" NOT NULL DEFAULT 'DOCUMENTATION_BRANCH';
ALTER TABLE "repositories" ADD COLUMN "documentation_branch_name" TEXT;

-- Update existing rows
UPDATE "repositories" SET "documentation_branch_name" = 'docpulse/docs';

-- AlterTable
ALTER TABLE "workflow_runs" ADD COLUMN "target_branch" TEXT;
