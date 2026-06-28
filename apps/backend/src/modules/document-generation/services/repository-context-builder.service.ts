import { Injectable } from '@nestjs/common';
import type { WorkflowState } from '../../../domain/workflow';

export interface CriticPromptContext {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export interface RepositoryGenerationContext {
  repositoryName: string;
  rootPath: string;
  languages: string[];
  frameworks: string[];
  dependencies: Record<string, string>;
  existingDocs: string[];
  missingDocs: string[];
  readmeContent?: string;
  architectureFiles: string[];
  apiDocs: string[];
  gitDiff?: string;
  formattedSummary: string;
  criticFeedback?: CriticPromptContext;
  humanReviewFeedback?: string;
  generationIteration: number;
}

@Injectable()
export class RepositoryContextBuilderService {
  /**
   * Pure deterministic transformer converting WorkflowState into RepositoryGenerationContext.
   * Zero side effects, zero network calls, zero AI logic.
   */
  public buildContext(state: WorkflowState): RepositoryGenerationContext {
    const repo = state.repository;
    const docs = state.documentation;
    const metadata = state.metadata as Record<string, any> | undefined;
    const generationMeta = state.generation as Record<string, any> | undefined;

    const repositoryName = repo?.name ?? 'unknown-repository';
    const rootPath = repo?.rootPath ?? '';
    const languages = repo?.languages ?? (repo as any)?.detectedLanguages ?? [];
    const frameworks = repo?.frameworks ?? (repo as any)?.detectedFrameworks ?? [];
    
    const dependencies: Record<string, string> = {};
    if (repo?.dependencies && Array.isArray(repo.dependencies)) {
      for (const dep of repo.dependencies) {
        if (dep?.name) dependencies[dep.name] = dep.version ?? '*';
      }
    } else if ((repo as any)?.packageJson?.dependencies) {
      Object.assign(dependencies, (repo as any).packageJson.dependencies);
    } else if (metadata?.dependencies) {
      Object.assign(dependencies, metadata.dependencies);
    }

    const existingDocs = (docs?.documentationFiles ?? []).map((file: any) => file.path ?? file.fileName ?? String(file));
    const missingDocs = docs?.missingDocuments ?? [];

    const gitDiff =
      (metadata?.gitDiff as string) ??
      (generationMeta?.gitDiff as string) ??
      undefined;

    const readmeFile = (docs?.documentationFiles ?? []).find((f: any) =>
      (f.path ?? f.fileName ?? String(f)).toLowerCase().includes('readme'),
    );
    const readmeContent = readmeFile
      ? (readmeFile as any).summary ?? (readmeFile as any).content ?? undefined
      : undefined;

    const architectureFiles = existingDocs.filter(
      (path: string) => path.toLowerCase().includes('arch') || path.toLowerCase().includes('design'),
    );
    const apiDocs = existingDocs.filter(
      (path: string) => path.toLowerCase().includes('api') || path.toLowerCase().includes('swagger'),
    );

    const formattedSummary = [
      `Repository: ${repositoryName}`,
      `Languages: ${languages.join(', ') || 'None detected'}`,
      `Frameworks: ${frameworks.join(', ') || 'None detected'}`,
      `Existing Documentation: ${existingDocs.length} files (${existingDocs.join(', ') || 'None'})`,
      `Missing Documentation: ${missingDocs.join(', ') || 'None'}`,
      gitDiff ? `Git Diff Available: Yes (${gitDiff.length} chars)` : `Git Diff Available: No`,
    ].join('\n');

    let criticFeedback: CriticPromptContext | undefined = undefined;
    if (state.criticReview) {
      criticFeedback = {
        overallScore: state.criticReview.score ?? 0,
        strengths: [],
        weaknesses: state.criticReview.issues ?? [],
        suggestions: state.criticReview.suggestions ?? [],
      };
    }

    const humanReviewFeedback = (state as any).humanReviewFeedback ?? undefined;
    const generationIteration = (state as any).generationIteration ?? 1;

    return {
      repositoryName,
      rootPath,
      languages,
      frameworks,
      dependencies,
      existingDocs,
      missingDocs,
      readmeContent,
      architectureFiles,
      apiDocs,
      gitDiff,
      formattedSummary,
      criticFeedback,
      humanReviewFeedback,
      generationIteration,
    };
  }
}
