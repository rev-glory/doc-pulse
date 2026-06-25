export const CRITIC_REVIEW_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    score: {
      type: 'number',
      description: 'Quality score from 0 to 100 assessing overall documentation excellence',
    },
    passed: {
      type: 'boolean',
      description: 'True if documentation quality meets acceptable threshold, false otherwise',
    },
    issues: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of identified deficiencies, missing sections, or inaccuracies',
    },
    suggestions: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of actionable suggestions for documentation improvement',
    },
  },
  required: ['score', 'passed', 'issues', 'suggestions'],
};
