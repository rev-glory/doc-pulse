import * as fs from "node:fs/promises";
import * as path from "node:path";
import { REPOSITORY_ANALYSIS_CONSTANTS } from "../constants/repository-analysis.constants";
import {
  DocumentationInventory,
  DocumentationFile,
  DocumentationType,
} from "../../../domain/documentation";
import { normalizeDocumentationDirectory } from "../../repositories/validators/documentation-directory.validator";
import { DOCPULSE_GENERATION_MARKER } from "../../workflow/constants/docpulse-marker.constants";

export async function detectDocumentation(rootPath: string): Promise<string[]> {
  const docs: string[] = [];
  const entries = await fs.readdir(rootPath).catch(() => [] as string[]);

  for (const entry of entries) {
    const isMatch = REPOSITORY_ANALYSIS_CONSTANTS.DOCUMENTATION_PATTERNS.some(
      (pattern) => {
        return entry.toLowerCase().startsWith(pattern.toLowerCase());
      },
    );
    if (isMatch) {
      docs.push(entry);
    }
  }

  return docs;
}

export async function detectEnvironmentFiles(
  rootPath: string,
): Promise<string[]> {
  const envFiles: string[] = [];
  const entries = await fs.readdir(rootPath).catch(() => [] as string[]);

  for (const file of REPOSITORY_ANALYSIS_CONSTANTS.ENVIRONMENT_FILES) {
    if (entries.includes(file)) {
      envFiles.push(file);
    }
  }

  return envFiles;
}

export async function detectApiSpecifications(
  rootPath: string,
): Promise<string[]> {
  const specs: string[] = [];
  const entries = await fs.readdir(rootPath).catch(() => [] as string[]);

  for (const file of REPOSITORY_ANALYSIS_CONSTANTS.API_SPECIFICATIONS) {
    if (entries.includes(file)) {
      specs.push(file);
    }
  }

  return specs;
}

/**
 * Builds a DocumentationInventory for the given repository root.
 *
 * Classification rules (single-pass — no extra filesystem scan):
 *   - Files whose first line is DOCPULSE_GENERATION_MARKER → previousGeneratedDocumentation
 *     The marker is stripped before the content is stored so it never reaches the LLM.
 *   - All other files → documentationFiles (developer-authored)
 */
export async function buildDocumentationInventory(
  rootPath: string,
  documentationDirectory: string = "docs",
): Promise<DocumentationInventory> {
  const documentationFiles: DocumentationFile[] = [];
  const previousGeneratedDocumentation: DocumentationFile[] = [];
  const standardDocs = Object.values(DocumentationType).filter(
    (type) => type !== DocumentationType.Other,
  );
  const foundTypes = new Set<DocumentationType>();

  const cleanDir = normalizeDocumentationDirectory(documentationDirectory);
  const targetDir = cleanDir === "." ? rootPath : path.join(rootPath, cleanDir);

  // Map a filename to its canonical DocumentationType.
  const mapType = (filename: string): DocumentationType => {
    const lower = filename.toLowerCase();
    if (lower.includes("readme")) return DocumentationType.README;
    if (lower.includes("architecture")) return DocumentationType.Architecture;
    if (lower.includes("api")) return DocumentationType.API;
    if (lower.includes("deploy")) return DocumentationType.Deployment;
    if (lower.includes("contributing")) return DocumentationType.Contributing;
    if (lower.includes("changelog")) return DocumentationType.Changelog;
    if (lower.includes("license")) return DocumentationType.License;
    return DocumentationType.Other;
  };

  const processDir = async (dirPath: string) => {
    const entries = await fs
      .readdir(dirPath, { withFileTypes: true })
      .catch(() => []);
    for (const entry of entries) {
      if (!entry.isFile()) continue;

      const type = mapType(entry.name);

      // Only process standard documentation types or files in the configured docs directory.
      if (
        type !== DocumentationType.Other ||
        dirPath.endsWith("docs") ||
        dirPath.endsWith("docs/") ||
        dirPath.endsWith("docs\\") ||
        (cleanDir !== "." && dirPath.endsWith(cleanDir))
      ) {
        const filePath = path.join(dirPath, entry.name);
        const relativePath = filePath
          .replace(rootPath, "")
          .replace(/^[\\\/]/, "")
          .replace(/\\/g, "/");

        // Read the full file content in one pass — used for both marker detection and LLM context.
        // If the read fails, treat the file as developer-authored without content.
        let rawContent: string | undefined;
        try {
          rawContent = await fs.readFile(filePath, "utf8");
        } catch {
          rawContent = undefined;
        }

        const isDocPulseGenerated =
          rawContent !== undefined &&
          rawContent.startsWith(DOCPULSE_GENERATION_MARKER);

        if (isDocPulseGenerated) {
          // Strip the marker line (and the newline that follows it) so it never appears downstream.
          const afterMarker = rawContent!.startsWith(
            DOCPULSE_GENERATION_MARKER + "\n",
          )
            ? rawContent!.slice(DOCPULSE_GENERATION_MARKER.length + 1)
            : rawContent!.slice(DOCPULSE_GENERATION_MARKER.length);

          previousGeneratedDocumentation.push({
            fileName: entry.name,
            path: relativePath,
            type,
            exists: true,
            qualityScore: 1.0,
            isDocPulseGenerated: true,
            content: afterMarker,
          });
        } else {
          documentationFiles.push({
            fileName: entry.name,
            path: relativePath,
            type,
            exists: true,
            qualityScore: 1.0,
          });
        }

        foundTypes.add(type);
      }
    }
  };

  // Return an empty inventory when the target directory does not exist.
  let directoryExists = false;
  try {
    const stat = await fs.stat(targetDir);
    if (stat.isDirectory()) {
      directoryExists = true;
    }
  } catch {
    // directory absent — not an error
  }

  if (directoryExists) {
    await processDir(targetDir);
  }

  const missingDocuments = standardDocs.filter((type) => !foundTypes.has(type));

  return {
    documentationFiles,
    previousGeneratedDocumentation,
    missingDocuments,
    outdatedDocuments: [],
  };
}
