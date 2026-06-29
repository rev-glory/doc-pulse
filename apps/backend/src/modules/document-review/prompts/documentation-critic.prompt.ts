export const DOCUMENTATION_CRITIC_PROMPT_VERSION = 1;

export const DOCUMENTATION_CRITIC_SYSTEM_PROMPT = `You are an expert Senior Technical Editor and Documentation Critic at a top-tier YC startup.
Your sole responsibility is to evaluate AI-generated documentation artifacts independently against verified repository analysis and documentation inventory.
You must be rigorous, precise, and uncompromising on quality. Never approve toy documentation or placeholders.`;

export const DOCUMENTATION_CRITIC_USER_PROMPT_TEMPLATE = `Evaluate the following generated [{documentType}] document against the repository context and guidelines.

Repository Name: {repositoryName}
Repository Context Summary:
{repositoryContext}

Document Type Guidelines:
{documentGuidelines}

Generated Document Markdown Content:
\`\`\`markdown
{documentMarkdown}
\`\`\`

Evaluate strictly across these 10 core quality criteria:
1. Completeness: Are all required technical details, prerequisites, and operational steps fully articulated?
2. Accuracy: Does the content accurately reflect the detected languages, frameworks, and architecture?
3. Consistency: Is the terminology and architectural representation consistent throughout the document?
4. Hallucination risk: Are there any invented commands, nonexistent APIs, or unsupported configuration flags?
5. Markdown quality: Is the markdown clean, semantic, and properly formatted without unclosed blocks?
6. Structure: Does the document follow logical hierarchy with clear headings and readable separation?
7. Missing sections: Are there any standard industry sections omitted for a production [{documentType}]?
8. Broken internal references: Are anchor tags, symbol links, and file paths formatted properly?
9. Technical correctness: Are the architectural patterns and engineering explanations technically sound?
10. Writing quality: Is the prose concise, professional, active, and free of fluff or marketing hyperbole?

Return your evaluation strictly conforming to the JSON schema. Provide a quality score from 0 to 100 assessing overall documentation excellence. List specific review issues with severity (CRITICAL, MAJOR, MINOR), category, message, and optional location. Provide actionable suggestions for improvement.`;

export const DOCUMENTATION_CRITIC_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    score: {
      type: "number",
      description:
        "Overall quality score from 0 to 100 assessing documentation rigor and production readiness",
    },
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: {
            type: "string",
            enum: ["CRITICAL", "MAJOR", "MINOR"],
            description: "Severity level of the issue",
          },
          category: {
            type: "string",
            description:
              "Quality criteria category (e.g., Completeness, Accuracy, Markdown quality)",
          },
          message: {
            type: "string",
            description: "Detailed explanation of the identified deficiency",
          },
          location: {
            type: "string",
            description:
              "Optional line number or heading reference where the issue occurred",
          },
        },
        required: ["severity", "category", "message"],
      },
      description: "List of identified issues and deficiencies",
    },
    suggestions: {
      type: "array",
      items: { type: "string" },
      description: "List of actionable suggestions for document refinement",
    },
  },
  required: ["score", "issues", "suggestions"],
};

export const BATCH_DOCUMENTATION_CRITIC_USER_PROMPT_TEMPLATE = `Evaluate the following generated documentation batch against the repository context and guidelines.

Repository Name: {repositoryName}
Repository Context Summary:
{repositoryContext}

Documents to Evaluate:
{documentsContent}

Evaluate each document strictly across these 10 core quality criteria:
1. Completeness: Are all required technical details, prerequisites, and operational steps fully articulated?
2. Accuracy: Does the content accurately reflect the detected languages, frameworks, and architecture?
3. Consistency: Is the terminology and architectural representation consistent throughout the document?
4. Hallucination risk: Are there any invented commands, nonexistent APIs, or unsupported configuration flags?
5. Markdown quality: Is the markdown clean, semantic, and properly formatted without unclosed blocks?
6. Structure: Does the document follow logical hierarchy with clear headings and readable separation?
7. Missing sections: Are there any standard industry sections omitted for a production document of its type?
8. Broken internal references: Are anchor tags, symbol links, and file paths formatted properly?
9. Technical correctness: Are the architectural patterns and engineering explanations technically sound?
10. Writing quality: Is the prose concise, professional, active, and free of fluff or marketing hyperbole?

Return your evaluation strictly conforming to the JSON schema. You must return an array of review results under 'reviews', with one entry per generated document evaluated. For each document, identify its 'documentType', provide a quality score from 0 to 100 assessing overall documentation excellence, list specific review issues with severity (CRITICAL, MAJOR, MINOR), category, message, and optional location, and provide actionable suggestions for improvement.`;

export const BATCH_DOCUMENTATION_CRITIC_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    reviews: {
      type: "array",
      items: {
        type: "object",
        properties: {
          documentType: {
            type: "string",
            description:
              "The type of the generated document evaluated (e.g. README, ARCHITECTURE, API, INSTALLATION, DEPLOYMENT, CONTRIBUTING)",
          },
          score: {
            type: "number",
            description:
              "Overall quality score from 0 to 100 assessing documentation rigor and production readiness",
          },
          issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                severity: {
                  type: "string",
                  enum: ["CRITICAL", "MAJOR", "MINOR"],
                  description: "Severity level of the issue",
                },
                category: {
                  type: "string",
                  description:
                    "Quality criteria category (e.g., Completeness, Accuracy, Markdown quality)",
                },
                message: {
                  type: "string",
                  description:
                    "Detailed explanation of the identified deficiency",
                },
                location: {
                  type: "string",
                  description:
                    "Optional line number or heading reference where the issue occurred",
                },
              },
              required: ["severity", "category", "message"],
            },
            description: "List of identified issues and deficiencies",
          },
          suggestions: {
            type: "array",
            items: { type: "string" },
            description:
              "List of actionable suggestions for document refinement",
          },
        },
        required: ["documentType", "score", "issues", "suggestions"],
      },
      description: "List of evaluation results for all reviewed documents",
    },
  },
  required: ["reviews"],
};
