import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { WorkflowGraphState } from '../graph/graph.types';
import { DOCUMENTATION_EXTENSIONS, DEPENDENCY_LOCK_FILES } from '../constants/patterns';

export const SKIP_RULES = Symbol('SKIP_RULES');

export interface SkipDecision {
  shouldSkip: boolean;
  reason?: string;
}

export interface SkipRuleContext {
  isRepositoryActive: boolean;
  modifiedFiles: string[];
  commitMessage: string;
  state: WorkflowGraphState;
}

export interface SkipRule {
  evaluate(context: SkipRuleContext): Promise<SkipDecision>;
}

@Injectable()
export class DisabledRepositoryRule implements SkipRule {
  public async evaluate(context: SkipRuleContext): Promise<SkipDecision> {
    if (!context.isRepositoryActive) {
      return { shouldSkip: true, reason: 'Repository documentation generation disabled' };
    }
    return { shouldSkip: false };
  }
}

@Injectable()
export class CommitMessageSkipRule implements SkipRule {
  public async evaluate(context: SkipRuleContext): Promise<SkipDecision> {
    const skipKeywords = ['[skip ci]', '[ci skip]', '[skip docs]', '[skip docpulse]'];
    const lowerMsg = context.commitMessage.toLowerCase();
    if (skipKeywords.some((kw) => lowerMsg.includes(kw))) {
      return { shouldSkip: true, reason: 'Explicit skip request in commit message' };
    }
    return { shouldSkip: false };
  }
}

@Injectable()
export class DocumentationOnlyRule implements SkipRule {
  public async evaluate(context: SkipRuleContext): Promise<SkipDecision> {
    const files = context.modifiedFiles;
    if (files.length === 0) {
      return { shouldSkip: false };
    }

    const isDoc = (f: string) => {
      const lower = f.toLowerCase();
      const ext = path.extname(lower);
      return (
        DOCUMENTATION_EXTENSIONS.includes(ext) ||
        lower.startsWith('docs/') ||
        lower.includes('/docs/')
      );
    };

    if (files.every(isDoc)) {
      return { shouldSkip: true, reason: 'Documentation-only changes' };
    }
    return { shouldSkip: false };
  }
}

@Injectable()
export class DependencyOnlyRule implements SkipRule {
  public async evaluate(context: SkipRuleContext): Promise<SkipDecision> {
    const files = context.modifiedFiles;
    if (files.length === 0) {
      return { shouldSkip: false };
    }

    const isLock = (f: string) => {
      const base = path.basename(f).toLowerCase();
      return DEPENDENCY_LOCK_FILES.includes(base);
    };

    if (files.every(isLock)) {
      return { shouldSkip: true, reason: 'Dependency-only updates' };
    }
    return { shouldSkip: false };
  }
}
