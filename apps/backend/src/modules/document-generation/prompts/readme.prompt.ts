export const README_PROMPT_TEMPLATE = `
You are an expert Technical Writer.
Generate a comprehensive README for a project based on the following repository analysis and documentation inventory.

Project Overview
{overview}

Technologies Detected
{technologies}

Project Structure
{structure}

Existing Documentation Inventory
{existingDocs}

Instructions:
1. Include a catchy title and a project overview.
2. Document the technology stack used in the project.
3. Provide setup instructions and available scripts.
4. Provide a high-level overview of the project structure.
5. Reference existing documentation where appropriate.
6. Format the output in clean, professional Markdown.
`;
