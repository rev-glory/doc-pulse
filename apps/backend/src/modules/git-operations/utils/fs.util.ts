import * as fs from 'fs/promises';

/**
 * Reusable utility for safe recursive directory deletion.
 * - Ignores missing directories (never throws for ENOENT).
 * - Retries transient filesystem errors (e.g. Windows file locking).
 */
export async function deleteDirectoryIfExists(dirPath: string, maxRetries = 3, delayMs = 100): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
      return;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return; // Ignore missing directories
      }
      if (attempt === maxRetries) {
        throw error; // Re-throw on final attempt
      }
      // Wait before retrying transient error
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
