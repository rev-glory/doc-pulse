import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Dependencies, Scripts } from '../interfaces/repository-analysis.interface';

export async function parsePackageJson(rootPath: string): Promise<{
  name: string;
  dependencies: Dependencies;
  scripts: Scripts;
} | null> {
  try {
    const packageJsonPath = path.join(rootPath, 'package.json');
    const content = await fs.readFile(packageJsonPath, 'utf8');
    const parsed = JSON.parse(content);

    return {
      name: parsed.name || path.basename(rootPath),
      dependencies: {
        production: parsed.dependencies || {},
        development: parsed.devDependencies || {},
        peer: parsed.peerDependencies || {},
      },
      scripts: parsed.scripts || {},
    };
  } catch (error) {
    // Gracefully handle missing or invalid package.json
    return null;
  }
}
