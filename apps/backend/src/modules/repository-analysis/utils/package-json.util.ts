import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Dependency, DependencyType } from "../../../domain/repository";

export async function parsePackageJson(rootPath: string): Promise<{
  name: string;
  dependencies: Dependency[];
  scripts: Record<string, string>;
} | null> {
  try {
    const packageJsonPath = path.join(rootPath, "package.json");
    const content = await fs.readFile(packageJsonPath, "utf8");
    const parsed = JSON.parse(content);

    return {
      name: parsed.name || path.basename(rootPath),
      dependencies: [
        ...Object.entries(parsed.dependencies || {}).map(([name, version]) => ({
          name,
          version: String(version),
          type: DependencyType.dependency,
        })),
        ...Object.entries(parsed.devDependencies || {}).map(
          ([name, version]) => ({
            name,
            version: String(version),
            type: DependencyType.devDependency,
          }),
        ),
        ...Object.entries(parsed.peerDependencies || {}).map(
          ([name, version]) => ({
            name,
            version: String(version),
            type: DependencyType.peerDependency,
          }),
        ),
      ],
      scripts: parsed.scripts || {},
    };
  } catch (error) {
    // Gracefully handle missing or invalid package.json
    return null;
  }
}
