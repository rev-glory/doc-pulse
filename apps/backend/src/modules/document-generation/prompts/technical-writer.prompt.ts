import { GeneratedDocumentType } from "../../../domain/workflow";

export const TECHNICAL_WRITER_PROMPT_VERSION = 1;

export const TECHNICAL_WRITER_SYSTEM_PROMPT = `You are DocPulse Technical Writer, an expert principal software architect and technical documentation engineer.
Your sole responsibility is generating production-grade, highly accurate, Markdown documentation for a software repository.
You must return only structured JSON matching the provided JSON schema. Do not wrap output in Markdown code blocks or fences.`;

export const TECHNICAL_WRITER_USER_PROMPT_TEMPLATE = `Generate the {documentType} document for repository "{repositoryName}".

### Repository Summary Context
{repositoryContext}

### Specific Document Guidelines for {documentType}
{documentGuidelines}

Ensure the generated markdown is comprehensive, well-structured with proper Markdown hierarchy (H1 title, H2 sections), and accurately reflects the provided repository context.`;

export const DOCUMENT_TYPE_GUIDELINES: Record<GeneratedDocumentType, string> = {
  [GeneratedDocumentType.README]: `Create a clear, professional project README.md. Include project overview, key features, quickstart summary, and link to further docs.`,
  [GeneratedDocumentType.INSTALLATION]: `Create an INSTALLATION.md guide. Detail system prerequisites, package manager commands, environment variable configuration, and local build steps.`,
  [GeneratedDocumentType.ARCHITECTURE]: `Create an ARCHITECTURE.md document. Explain system design, folder structure, core domain modules, data flow, and key architectural patterns.`,
  [GeneratedDocumentType.API]: `Create an API.md reference. Outline exposed endpoints, service interfaces, input/output contracts, and authentication mechanisms.`,
  [GeneratedDocumentType.CONTRIBUTING]: `Create a CONTRIBUTING.md guide. Explain branch strategy, code formatting rules, commit conventions, testing expectations, and PR submission process.`,
  [GeneratedDocumentType.DEPLOYMENT]: `Create a DEPLOYMENT.md guide. Detail production build steps, Docker containerization, environment variables, CI/CD pipelines, and health checks.`,
};

export const DOCUMENT_OUTPUT_SCHEMA: Record<string, unknown> = {
  type: "OBJECT",
  description: "Structured documentation generation output schema",
  properties: {
    title: { type: "STRING", description: "Document title" },
    path: {
      type: "STRING",
      description: "Relative file path (e.g., README.md or docs/API.md)",
    },
    markdown: {
      type: "STRING",
      description: "Full generated Markdown content",
    },
    summary: {
      type: "STRING",
      description: "Brief 1-2 sentence summary of document contents",
    },
  },
  required: ["title", "path", "markdown", "summary"],
};

/**
 * Injected into the Technical Writer prompt when previousGeneratedDocumentation exists.
 *
 * Placement rules:
 *   - Appended after the source code analysis section, before refinement context.
 *   - Omitted entirely when there are no previously generated documents.
 *   - The DOCPULSE_GENERATION_MARKER must never appear in this section (it is stripped by
 *     the documentation locator before documents reach the prompt builder).
 */
export const PREVIOUS_DOCPULSE_DOCS_PROMPT_SECTION = `

## Previous DocPulse Documentation

The following documents were generated during a previous DocPulse run.

Use them **only** as reference material to preserve consistency in terminology,
document structure, and organization across generations.

**The current source code is the authoritative source of truth.**
If previous documentation conflicts with the source code, always follow the source code.
Never copy outdated implementation details from this section.

{previousDocumentation}
`;
