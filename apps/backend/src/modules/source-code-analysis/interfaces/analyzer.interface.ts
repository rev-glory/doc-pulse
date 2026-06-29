import { RepositoryIndex } from "../services/repository-scanner.service";
import { SourceCodeAnalysis } from "../../../domain/source-code-analysis/source-code-analysis";

export interface CodebaseAnalyzer {
  supports(index: RepositoryIndex): boolean;
  analyze(index: RepositoryIndex): Promise<Partial<SourceCodeAnalysis>>;
}
