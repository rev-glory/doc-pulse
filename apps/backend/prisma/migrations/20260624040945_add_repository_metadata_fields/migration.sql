/*
  Warnings:

  - You are about to drop the column `github_repo_id` on the `repositories` table. All the data in the column will be lost.
  - You are about to drop the column `is_private` on the `repositories` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[github_repository_id]` on the table `repositories` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `clone_url` to the `repositories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `github_repository_id` to the `repositories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `html_url` to the `repositories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `repositories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `repository_owner` to the `repositories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `visibility` to the `repositories` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "repositories_github_repo_id_key";

-- AlterTable
ALTER TABLE "repositories" DROP COLUMN "github_repo_id",
DROP COLUMN "is_private",
ADD COLUMN     "clone_url" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "github_repository_id" INTEGER NOT NULL,
ADD COLUMN     "html_url" TEXT NOT NULL,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "last_synced_at" TIMESTAMP(3),
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "private" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "repository_owner" TEXT NOT NULL,
ADD COLUMN     "visibility" TEXT NOT NULL,
ALTER COLUMN "doc_paths" SET DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "repositories_github_repository_id_key" ON "repositories"("github_repository_id");

-- CreateIndex
CREATE INDEX "repositories_github_repository_id_idx" ON "repositories"("github_repository_id");

-- CreateIndex
CREATE INDEX "repositories_installation_id_idx" ON "repositories"("installation_id");

-- CreateIndex
CREATE INDEX "repositories_owner_id_idx" ON "repositories"("owner_id");

-- CreateIndex
CREATE INDEX "repositories_is_active_idx" ON "repositories"("is_active");
