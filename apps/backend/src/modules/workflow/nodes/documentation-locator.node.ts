import { Injectable } from '@nestjs/common';
import { WorkflowAnnotation } from '../graph/state.annotation';

@Injectable()
export class DocumentationLocatorNode {
  public async invoke(state: typeof WorkflowAnnotation.State): Promise<Partial<typeof WorkflowAnnotation.State>> {
    // TODO: In a future commit, implement deterministic documentation discovery.
    // For now, we just pass the state through unmodified.
    
    return state;
  }
}
