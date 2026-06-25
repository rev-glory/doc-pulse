export const DOCUMENTATION_REVIEW_PROMPT_TEMPLATE = `
You are an expert Senior Technical Editor and Documentation Critic.
Review the following generated documentation artifacts against the repository analysis and documentation inventory.

Repository Overview:
Name: {repositoryName}
Languages: {languages}
Frameworks: {frameworks}
Workspace Type: {workspaceType}

Existing Documentation Inventory:
Files: {documentationFiles}

Generated Documents to Review:
{generatedContent}

Review Criteria:
1. Completeness: Are all required sections present across README, INSTALLATION, and ARCHITECTURE?
2. Accuracy: Do the generated documents accurately align with detected repository languages and frameworks?
3. Consistency: Do any generated documents contradict each other or existing documentation?
4. Clarity: Is the technical prose clear, professional, and easy to follow?
5. Coverage: Are key technologies and structure laid out appropriately?

Evaluate the documentation strictly.
`;
