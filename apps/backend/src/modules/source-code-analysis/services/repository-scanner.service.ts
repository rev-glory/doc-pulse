import { Injectable, Logger } from '@nestjs/common';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

export interface RepositoryFile {
  relativePath: string;
  size: number;
  extension: string;
}

export interface RepositoryIndex {
  rootPath: string;
  files: RepositoryFile[];
}

@Injectable()
export class RepositoryScannerService {
  private readonly logger = new Logger(RepositoryScannerService.name);
  private readonly ignoredDirs = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', 'vendor']);
  private readonly maxSizeLimit = 500 * 1024; // 500 KB limit for reading content

  public async buildIndex(rootPath: string): Promise<RepositoryIndex> {
    this.logger.debug(`Building repository codebase index for: ${rootPath}`);
    const files: RepositoryFile[] = [];

    const walk = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relative = path.relative(rootPath, fullPath).replace(/\\/g, '/');

          if (entry.isDirectory()) {
            if (this.ignoredDirs.has(entry.name)) {
              continue;
            }
            await walk(fullPath);
          } else if (entry.isFile()) {
            try {
              const stat = await fs.stat(fullPath);
              files.push({
                relativePath: relative,
                size: stat.size,
                extension: path.extname(entry.name).toLowerCase(),
              });
            } catch (err) {
              this.logger.warn(`Failed to stat file: ${relative}`, err);
            }
          }
        }
      } catch (err) {
        this.logger.warn(`Failed to read directory: ${dir}`, err);
      }
    };

    await walk(rootPath);
    this.logger.debug(`Index build complete: ${files.length} source files indexed.`);
    return {
      rootPath,
      files,
    };
  }

  public async readFile(index: RepositoryIndex, relativePath: string): Promise<string> {
    const fullPath = path.join(index.rootPath, relativePath);
    try {
      const stat = await fs.stat(fullPath);
      if (stat.size > this.maxSizeLimit) {
        this.logger.warn(`File exceeds read size cap: ${relativePath} (${stat.size} bytes)`);
        return '';
      }
      return await fs.readFile(fullPath, 'utf8');
    } catch (err) {
      this.logger.warn(`Failed to read file: ${relativePath}`, err);
      return '';
    }
  }
}
