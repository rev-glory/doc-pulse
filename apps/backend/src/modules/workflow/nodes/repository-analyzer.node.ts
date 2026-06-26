import { Injectable } from '@nestjs/common';
import { WorkflowGraphState } from '../graph/graph.types';
import { RepositoryAnalysisService } from '../../repository-analysis/services/repository-analysis.service';
import { RepositoryCloneService } from '../../git-operations/services/repository-clone.service';
import { WorkspaceService } from '../../git-operations/services/workspace.service';
import { PrismaService } from '@/database';

@Injectable()
export class RepositoryAnalyzerNode {
  constructor(
    private readonly repositoryAnalysisService: RepositoryAnalysisService,
    private readonly repositoryCloneService: RepositoryCloneService,
    private readonly workspaceService: WorkspaceService,
    private readonly prisma: PrismaService,
  ) {}

  public async invoke(state: WorkflowGraphState): Promise<Partial<WorkflowGraphState>> {
    const repositoryId = state.repositoryId;
    if (!repositoryId) {
      return {};
    }

    const repoRecord = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
      include: { installation: true },
    });
    if (!repoRecord) {
      throw new Error(`Repository not found: ${repositoryId}`);
    }

    const exists = await this.repositoryCloneService.repositoryExists(repositoryId);
    if (!exists) {
      await this.repositoryCloneService.cloneRepository({
        id: repoRecord.id,
        cloneUrl: repoRecord.cloneUrl,
        defaultBranch: repoRecord.defaultBranch,
      });
    }

    const workspacePath = this.workspaceService.getWorkspacePath(repositoryId);

    const repository = await this.repositoryAnalysisService.analyzeRepository(workspacePath);

    return {
      workspacePath,
      repository: {
        ...repository,
        owner: repoRecord.repositoryOwner,
      } as any,
      metadata: {
        ...(state.metadata ?? {}),
        installationId: repoRecord.installation?.installationId ?? state.metadata?.installationId,
        owner: repoRecord.repositoryOwner,
      },
    };
  }
}
