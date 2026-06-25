export const INSTALLATION_PROMPT_TEMPLATE = `
You are an expert Technical Writer.
Generate an INSTALLATION.md document based on the following repository analysis and documentation inventory.

Frameworks & Package Managers
{frameworks}

Available Scripts
{scripts}

Setup Instructions
{setup_instructions}

Existing Documentation Files
{existingDocs}

Instructions:
1. List all prerequisites needed to run the project.
2. Provide step-by-step installation instructions.
3. Document any required environment variables.
4. List the commands to run the project locally.
5. Format the output in clean, professional Markdown.
`;
