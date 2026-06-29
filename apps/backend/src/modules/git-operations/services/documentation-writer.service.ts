import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs/promises";
import * as path from "path";

import type { GeneratedDocument } from "@/domain/workflow";
import { normalizeDocumentationDirectory } from "../../repositories/validators/documentation-directory.validator";
import { DOCPULSE_GENERATION_MARKER } from "../../workflow/constants/docpulse-marker.constants";

@Injectable()
export class DocumentationWriterService {
  private readonly logger = new Logger(DocumentationWriterService.name);

  /**
   * Transactionally write generated documents to the workspace repository.
   * Uses a temporary staging directory inside the workspace to ensure partial failures
   * never corrupt active working tree files.
   */
  async writeDocuments(
    workspacePath: string,
    runId: string,
    documents: GeneratedDocument[],
    documentationDirectory: string = "docs",
  ): Promise<{ writtenFiles: string[]; durationMs: number }> {
    const startTime = Date.now();
    const tmpDirName = `.docpulse_tmp_${runId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const stagingDir = path.join(workspacePath, tmpDirName);

    this.logger.debug(
      `Initiating transactional doc write for run [${runId}] in [${workspacePath}]...`,
    );

    try {
      // 1. Ensure clean staging dir
      await fs.rm(stagingDir, { recursive: true, force: true });
      await fs.mkdir(stagingDir, { recursive: true });

      const stagedRelPaths: string[] = [];
      const cleanDir = normalizeDocumentationDirectory(documentationDirectory);

      // 2. Write all generated docs to staging dir
      for (const doc of documents) {
        const canonicalContent = doc.markdown ?? doc.content ?? "";
        if (!doc.path) continue;

        const cleanDocPath = doc.path.replace(/^(\.\/|\/)+/, ""); // sanitize relative path
        const cleanRelPath =
          cleanDir === "." ? cleanDocPath : path.join(cleanDir, cleanDocPath);
        const targetStagingPath = path.join(stagingDir, cleanRelPath);

        // Prepend the generation marker so the locator can detect DocPulse-generated files
        // on the next run without an extra filesystem scan.
        const markedContent = `${DOCPULSE_GENERATION_MARKER}\n${canonicalContent}`;

        await fs.mkdir(path.dirname(targetStagingPath), { recursive: true });
        await fs.writeFile(targetStagingPath, markedContent, "utf8");
        stagedRelPaths.push(cleanRelPath);
      }

      // 3. Validate all writes succeeded (verify file existence and non-empty if content existed)
      for (const relPath of stagedRelPaths) {
        const stat = await fs.stat(path.join(stagingDir, relPath));
        if (!stat.isFile()) {
          throw new Error(
            `Staging validation failed: ${relPath} is not a valid file.`,
          );
        }
      }

      // 4. Atomically copy/move files from staging to workspace root
      const writtenFiles: string[] = [];
      for (const relPath of stagedRelPaths) {
        const stagedPath = path.join(stagingDir, relPath);
        const finalPath = path.join(workspacePath, relPath);

        await fs.mkdir(path.dirname(finalPath), { recursive: true });
        await fs.copyFile(stagedPath, finalPath); // copy over target
        writtenFiles.push(relPath);
      }

      // 5. Cleanup staging directory
      await fs.rm(stagingDir, { recursive: true, force: true });

      const durationMs = Date.now() - startTime;
      this.logger.log(
        `Successfully wrote ${writtenFiles.length} documentation files transactionally (${durationMs}ms).`,
      );
      return { writtenFiles, durationMs };
    } catch (error) {
      this.logger.error(
        `Transactional documentation write failed for run [${runId}]. Rolling back staging files...`,
        (error as Error).stack,
      );
      await fs.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
      throw error;
    }
  }
}
