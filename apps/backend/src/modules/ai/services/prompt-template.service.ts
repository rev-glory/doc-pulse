import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';

// ---------------------------------------------------------------------------
// PromptTemplateService
//
// Responsible for compiling raw prompt templates and injecting variables.
//
// Design:
//   • Abstracts away template interpolation mechanics.
//   • Ensures prompt construction is decoupled from business logic and execution.
//   • Replaces {variableName} tokens with corresponding values.
// ---------------------------------------------------------------------------

@Injectable()
export class PromptTemplateService {
  private readonly logger = new Logger(PromptTemplateService.name);

  /**
   * Compiles a raw template string with the provided variables.
   * 
   * @param template - The raw prompt string containing variables like {variableName}
   * @param variables - An object map of variable names to their values
   * @returns The fully formatted prompt string ready for LLM consumption
   */
  public async compile(template: string, variables: Record<string, unknown>): Promise<string> {
    this.logger.debug('Compiling prompt template...');
    
    try {
      return template.replace(/\{(\w+)\}/g, (match, key) => {
        if (key in variables && variables[key] !== undefined && variables[key] !== null) {
          return String(variables[key]);
        }
        return match;
      });
    } catch (error) {
      this.logger.error('Failed to compile prompt template', error instanceof Error ? error.stack : error);
      throw new InternalServerErrorException(
        `Prompt template compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
