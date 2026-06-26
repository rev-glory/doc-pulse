import { BadRequestException, Injectable } from '@nestjs/common';
import { WorkflowAnnotation } from '../graph/state.annotation';
import { DocumentGenerationService } from '../../document-generation/services/document-generation.service';

@Injectable()
export class TechnicalWriterNode {
  constructor(private readonly documentGenerationService: DocumentGenerationService) {}

  public async invoke(state: typeof WorkflowAnnotation.State): Promise<Partial<typeof WorkflowAnnotation.State>> {
    if (!state.repository || !state.documentation) {
      throw new BadRequestException('Repository summary or documentation inventory missing in state');
    }

    const generatedDocuments = await this.documentGenerationService.generateDocuments(state as any);

    return {
      generatedDocuments,
    };
  }
}
