import { BadRequestException, Injectable } from '@nestjs/common';
import { WorkflowGraphState } from '../graph/graph.types';
import { DocumentReviewService } from '../../document-review/services/document-review.service';

@Injectable()
export class DocumentationCriticNode {
  constructor(
    private readonly documentReviewService: DocumentReviewService,
  ) {}

  public async invoke(state: WorkflowGraphState): Promise<Partial<WorkflowGraphState>> {
    if (!state.repository || !state.documentation) {
      throw new BadRequestException('Repository summary or documentation inventory missing in state');
    }

    if (!state.generatedDocuments || state.generatedDocuments.length === 0) {
      throw new BadRequestException('Generated documents missing in state for documentation critic');
    }

    const criticReview = await this.documentReviewService.reviewDocuments(
      state.repository,
      state.documentation,
      state.generatedDocuments,
      state.runId,
      state.repositoryId,
    );

    return {
      criticReview,
    };
  }
}
