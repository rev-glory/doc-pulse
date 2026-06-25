import { registerAs } from '@nestjs/config';

import type { Env } from './env.validation';

// ---------------------------------------------------------------------------
// Workflow Orchestration Configuration (LangGraph)
//
// Registered under the 'workflow' namespace.
// Inject with: ConfigService.get<WorkflowConfig>('workflow')
// ---------------------------------------------------------------------------

export interface WorkflowConfig {
  minDocScore: number;
}

export const workflowConfig = registerAs('workflow', (): WorkflowConfig => {
  const env = process.env as unknown as Env;

  return {
    minDocScore: Number(env.WORKFLOW_MIN_DOC_SCORE),
  };
});
