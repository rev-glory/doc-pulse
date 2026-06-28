export interface DetectedTechnology {
  name: string;
  category: string;
  confidence: number;
}

export interface DependencySummary {
  production: string[];
  development: string[];
  frameworks: string[];
  databases: string[];
}

export interface ApiEndpoint {
  method: string;
  path: string;
  controller?: string;
  handler?: string;
}

export interface ArchitectureAnalysis {
  style: string;
  patterns: string[];
  layers: string[];
  moduleStructure: string[];
}

export interface ImportantFile {
  path: string;
  reason: string;
}

export interface ComplexityMetrics {
  totalSourceFiles: number;
  controllerCount: number;
  serviceCount: number;
  moduleCount: number;
  interfaceCount: number;
  classCount: number;
  testCount: number;
}

export interface SourceCodeAnalysis {
  analysisVersion: number;
  architecture: ArchitectureAnalysis;
  technologies: DetectedTechnology[];
  modules: string[];
  services: string[];
  apiEndpoints: ApiEndpoint[];
  database: string[];
  dependencies: DependencySummary;
  entryPoints: string[];
  configurationFiles: string[];
  importantFiles: ImportantFile[];
  importantDirectories: string[];
  metrics: ComplexityMetrics;
}
