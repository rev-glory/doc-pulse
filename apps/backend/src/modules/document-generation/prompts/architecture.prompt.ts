export const ARCHITECTURE_PROMPT_TEMPLATE = `
You are an expert Technical Architect and Writer.
Generate an ARCHITECTURE.md document based on the following repository analysis and documentation inventory.

Repository Structure
{structure}

Major Modules & Components
{modules}

Detected Technologies
{technologies}

Workspace Layout
{workspace_layout}

Existing Documentation Files
{existingDocs}

Instructions:
1. Describe the overall architecture and workspace layout.
2. Break down the major modules and their responsibilities.
3. Detail the key technologies used.
4. Format the output in clean, professional Markdown.
`;
