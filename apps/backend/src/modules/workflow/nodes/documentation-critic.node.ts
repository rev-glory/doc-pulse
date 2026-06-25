import { BadRequestException, Injectable } from '@nestjs/common';
import { WorkflowAnnotation } from '../graph/state.annotation';
import { DocumentReviewService } from '../../document-review/services/document-review.service';

@Injectable()
export class DocumentationCriticNode {
  constructor(private readonly documentReviewService: DocumentReviewService) {}

  public async invoke(state: typeof WorkflowAnnotation.State): Promise<Partial<typeof WorkflowAnnotation.State>> {
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
    );

    return {
      criticReview,
    };
  }
}
