import { Module } from "@nestjs/common";
import { RepositoryScannerService } from "./services/repository-scanner.service";
import { TypeScriptAnalyzerService } from "./services/language-analyzers/typescript-analyzer.service";
import { DependencyAnalyzerService } from "./services/analyzers/dependency-analyzer.service";
import { ArchitectureAnalyzerService } from "./services/analyzers/architecture-analyzer.service";
import { SourceCodeAnalysisService } from "./services/source-code-analysis.service";

@Module({
  providers: [
    RepositoryScannerService,
    TypeScriptAnalyzerService,
    DependencyAnalyzerService,
    ArchitectureAnalyzerService,
    SourceCodeAnalysisService,
  ],
  exports: [SourceCodeAnalysisService],
})
export class SourceCodeAnalysisModule {}
