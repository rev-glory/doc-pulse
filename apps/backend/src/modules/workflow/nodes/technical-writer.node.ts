import { BadRequestException, Injectable } from '@nestjs/common';
import { WorkflowGraphState } from '../graph/graph.types';
import { DocumentGenerationService } from '../../document-generation/services/document-generation.service';

@Injectable()
export class TechnicalWriterNode {
  constructor(private readonly documentGenerationService: DocumentGenerationService) {}

  public async invoke(state: WorkflowGraphState): Promise<Partial<WorkflowGraphState>> {
    if (!state.repository || !state.documentation) {
      throw new BadRequestException('Repository summary or documentation inventory missing in state');
    }

    const currentIteration = state.generationIteration ?? 1;
    const isRegeneration = state.humanReviewStatus === 'REJECTED';
    const nextIteration = isRegeneration ? currentIteration + 1 : currentIteration;

    const generatedDocuments = await this.documentGenerationService.generateDocuments(state);

    return {
      generatedDocuments,
      humanReviewStatus: undefined,
      humanReviewFeedback: undefined,
      generationIteration: nextIteration,
    };
  }
}
