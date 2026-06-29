import { Injectable } from "@nestjs/common";
import { WorkflowGraphState } from "../graph/graph.types";
import { SourceCodeAnalysisService } from "../../source-code-analysis/services/source-code-analysis.service";

@Injectable()
export class CodebaseAnalyzerNode {
  constructor(
    private readonly sourceCodeAnalysisService: SourceCodeAnalysisService,
  ) {}

  public async invoke(
    state: WorkflowGraphState,
  ): Promise<Partial<WorkflowGraphState>> {
    const workspacePath = state.workspacePath;
    if (!workspacePath) {
      throw new Error(
        "Missing workspace path in state during codebase analysis",
      );
    }

    const sourceCodeAnalysis =
      await this.sourceCodeAnalysisService.analyzeRepository(workspacePath);

    return {
      sourceCodeAnalysis,
    };
  }
}
