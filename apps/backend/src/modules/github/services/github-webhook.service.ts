import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';

import type { GitHubConfig } from '@/config';
import { PrismaService } from '@/database';
import { WebhookEventsService } from '@/modules/webhook-events/services/webhook-events.service';
import { RepositoriesService } from '@/modules/repositories/services/repositories.service';
import { GitHubInstallationService } from './github-installation.service';
import { WorkflowQueueService } from '@/modules/queue/services/workflow-queue.service';
import { WorkspaceService } from '@/modules/git-operations/services/workspace.service';
import { WorkspaceCleanupService } from '@/modules/git-operations/services/workspace-cleanup.service';

// ---------------------------------------------------------------------------
// Webhook Event Payload Shapes
//
// Minimal interfaces for the fields we actually consume from GitHub webhook
// payloads. We use 'unknown' for everything else to be safe — never trust
// arbitrary payloads from the internet.
// ---------------------------------------------------------------------------

interface WebhookPayloadWithAction {
  action?: string;
  repository?: {
    id: number;
  };
}

// ---------------------------------------------------------------------------
// GitHubWebhookService
//
// Responsibilities:
//   1. HMAC-SHA256 signature verification — rejects any request that does not
//      pass GitHub's signature check before any payload is parsed.
//   2. Event persistence — save incoming webhook events to database.
//   3. Job dispatching — send events to JobDispatcher for processing.
//
// Only the events we actively handle are wired. Unknown events are logged
// and ignored — returning 200 so GitHub does not retry them.
//
// Security: rawBody (Buffer) is required for signature verification. It must
// be captured before Express JSON body parsing runs.
// ---------------------------------------------------------------------------

@Injectable()
export class GitHubWebhookService {
  private readonly logger = new Logger(GitHubWebhookService.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly webhookEventsService: WebhookEventsService,
    private readonly gitHubInstallationService: GitHubInstallationService,
    @Inject(forwardRef(() => RepositoriesService))
    private readonly repositoriesService: RepositoriesService,
    @Inject(forwardRef(() => WorkflowQueueService))
    private readonly workflowQueueService: WorkflowQueueService,
    private readonly workspaceService: WorkspaceService,
    private readonly workspaceCleanupService: WorkspaceCleanupService,
  ) {
    const config = this.configService.get<GitHubConfig>('github')!;
    this.webhookSecret = config.webhookSecret;
  }

  // ---------------------------------------------------------------------------
  // Signature Verification
  // ---------------------------------------------------------------------------

  /**
   * Verify the HMAC-SHA256 signature sent by GitHub on every webhook request.
   *
   * GitHub sends the signature in the `X-Hub-Signature-256` header as:
   *   `sha256=<hex_digest>`
   *
   * We compute HMAC-SHA256 over the raw request body using the webhook secret
   * and compare with a constant-time comparison to prevent timing attacks.
   *
   * @returns true if the signature is valid, false otherwise.
   */
  verifySignature(rawBody: Buffer, signature: string): boolean {
    if (!signature || !signature.startsWith('sha256=')) {
      this.logger.warn('Webhook received without a valid signature header');
      return false;
    }

    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex')}`;

    // crypto.timingSafeEqual requires Buffers of equal length.
    // If lengths differ, the signature is definitely invalid.
    if (expectedSignature.length !== signature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature),
    );
  }

  // ---------------------------------------------------------------------------
  // Event Routing
  // ---------------------------------------------------------------------------

  /**
   * Route a verified webhook event to the appropriate handler.
   * Always resolves — errors are caught and logged.
   * The controller returns 200 regardless so GitHub does not retry.
   */
  async handleEvent(event: string, deliveryId: string, payload: Record<string, any>): Promise<void> {
    this.logger.log('Received GitHub webhook event', {
      event,
      deliveryId,
    });

    const parsedPayload = payload;
    const repository = payload?.repository?.id
      ? await this.prisma.repository.findUnique({
          where: { githubRepositoryId: Number(payload.repository.id) },
        })
      : null;
    const repositoryId = repository?.id;

    const normalizedEvent = event?.toLowerCase()?.trim() || '';

    // Persist the event
    await this.webhookEventsService.createEvent({
      githubDeliveryId: deliveryId,
      eventType: normalizedEvent,
      action: payload?.action,
      repositoryId,
      payload: parsedPayload,
    });

    try {
      switch (normalizedEvent) {
        case 'installation':
          const installationPayload = parsedPayload as any;
          const instId = installationPayload?.installation?.id;
          if (installationPayload?.action === 'created' || installationPayload?.action === 'edited') {
            const added = installationPayload?.repositories || installationPayload?.repositories_added || [];
            const removed = installationPayload?.repositories_removed || [];
            this.logger.log(`Processing installation.${installationPayload?.action}`, {
              installationId: instId,
              repositoryIds: [...added.map((r: any) => r.id), ...removed.map((r: any) => r.id)],
              repositoryNames: [...added.map((r: any) => r.full_name), ...removed.map((r: any) => r.full_name)],
              repositoriesAdded: added.map((r: any) => r.full_name),
              repositoriesRemoved: removed.map((r: any) => r.full_name),
            });
            await this.gitHubInstallationService.handleInstallationCreated(installationPayload);
            if (instId) {
              await this.repositoriesService.syncInstallationRepositoriesFromWebhook(Number(instId));
            }
          } else if (installationPayload?.action === 'deleted') {
            this.logger.log('Processing installation.deleted', {
              installationId: instId,
            });
            if (instId) {
              try {
                const dbInstallation = await this.prisma.installation.findUnique({
                  where: { installationId: Number(instId) },
                  include: { repositories: true },
                });
                if (dbInstallation && dbInstallation.repositories.length > 0) {
                  await Promise.allSettled(
                    dbInstallation.repositories.map((repo) =>
                      this.workspaceCleanupService.cleanupRepository(repo.id),
                    ),
                  );
                }
              } catch (error: any) {
                this.logger.error(`Error during installation.deleted repositories cleanup: ${error.message}`);
              }
            }
            await this.gitHubInstallationService.handleInstallationDeleted(Number(instId));
          }
          break;
        case 'installation_repositories':
          const instRepoPayload = parsedPayload as any;
          const repoInstId = instRepoPayload?.installation?.id;
          const reposAdded = instRepoPayload?.repositories_added || [];
          const reposRemoved = instRepoPayload?.repositories_removed || [];
          this.logger.log(`Processing installation_repositories.${instRepoPayload?.action}`, {
            installationId: repoInstId,
            repositoryIds: [...reposAdded.map((r: any) => r.id), ...reposRemoved.map((r: any) => r.id)],
            repositoryNames: [...reposAdded.map((r: any) => r.full_name), ...reposRemoved.map((r: any) => r.full_name)],
            repositoriesAdded: reposAdded.map((r: any) => r.full_name),
            repositoriesRemoved: reposRemoved.map((r: any) => r.full_name),
          });
          if (reposRemoved.length > 0) {
            try {
              await Promise.allSettled(
                reposRemoved.map(async (removedRepo: any) => {
                  const dbRepo = await this.prisma.repository.findUnique({
                    where: { githubRepositoryId: Number(removedRepo.id) },
                  });
                  if (dbRepo) {
                    await this.workspaceCleanupService.cleanupRepository(dbRepo.id);
                  }
                }),
              );
            } catch (error: any) {
              this.logger.error(`Error during installation_repositories.removed cleanup: ${error.message}`);
            }
          }
          if (repoInstId) {
            await this.repositoriesService.syncInstallationRepositoriesFromWebhook(Number(repoInstId));
          }
          break;
        case 'push': {
          const pushPayload = parsedPayload as any;
          const pushInstId = pushPayload?.installation?.id;
          const pushRepoName = pushPayload?.repository?.name || pushPayload?.repository?.full_name || 'unknown';
          const pushRepoId = pushPayload?.repository?.id;

          this.logger.log('Processing push', {
            installationId: pushInstId,
            repositoryId: pushRepoId,
            repositoryName: pushRepoName,
          });

          if (!repositoryId) {
            this.logger.warn(`Push received for untracked repository GitHub ID: ${pushRepoId}`);
            break;
          }

          const refBranch = pushPayload?.ref?.startsWith('refs/heads/')
            ? pushPayload.ref.substring('refs/heads/'.length)
            : pushPayload?.ref;

          if (!refBranch) {
            throw new Error('Unable to determine pushed branch from webhook payload.');
          }

          const defaultBranch = pushPayload?.repository?.default_branch ?? repository?.defaultBranch;

          if (
            pushPayload?.repository?.default_branch &&
            repository &&
            pushPayload.repository.default_branch !== repository.defaultBranch
          ) {
            this.logger.log(`Updating repository default branch from '${repository.defaultBranch}' to '${pushPayload.repository.default_branch}' to match current GitHub configuration.`);
            await this.prisma.repository.update({
              where: { id: repository.id },
              data: { defaultBranch: pushPayload.repository.default_branch },
            });
            repository.defaultBranch = pushPayload.repository.default_branch;
          }

          if (!defaultBranch) {
            throw new Error(`Could not determine default branch for repository ${pushRepoName}`);
          }

          if (refBranch !== defaultBranch) {
            this.logger.log(`Push received on branch '${refBranch}'`);
            this.logger.log(`Repository default branch is '${defaultBranch}'`);
            this.logger.log(`Skipping documentation generation because push is not on the default branch.`);
            this.logger.log(`Skipping workflow: repository=${pushRepoName} branch=${refBranch} defaultBranch=${defaultBranch} deliveryId=${deliveryId}`);
            break;
          }

          this.logger.log(`Push received on branch '${refBranch}'`);
          this.logger.log(`Default branch matched.`);
          this.logger.log(`Enqueuing documentation workflow.`);

          const afterSha = pushPayload?.after || pushPayload?.head_commit?.id || '';
          const commitMsg = pushPayload?.head_commit?.message || 'Update documentation';

          const workflowRun = await this.prisma.workflowRun.create({
            data: {
              status: 'QUEUED',
              correlationId: deliveryId,
              webhookDeliveryId: deliveryId,
              commitSha: afterSha,
              branch: refBranch,
              commitMessage: commitMsg,
              repositoryId: repositoryId,
            },
          });

          const repositoryPath = this.workspaceService.getRepositoryPath(repositoryId);

          const enqueued = await this.workflowQueueService.enqueueWorkflow({
            repositoryId: repositoryId,
            repositoryPath: repositoryPath,
            runId: workflowRun.id,
            executionMode: 'start',
            metadata: {
              event: 'push',
              deliveryId,
              commitSha: afterSha,
              branch: refBranch,
            },
          });

          this.logger.log('Workflow queued', {
            runId: workflowRun.id,
            jobId: enqueued.id,
          });
          this.logger.log('BullMQ job created');
          this.logger.log('Workflow started');
          break;
        }
        default:
          this.logger.debug(`Webhook event received: ${normalizedEvent} — job dispatch pending Queue infrastructure`);
      }

      // Mark as processed on success
      await this.webhookEventsService.markAsProcessed(deliveryId);
    } catch (error) {
      // Mark as failed on error
      this.logger.error('Error processing webhook event', {
        event,
        deliveryId,
        error,
      });
      await this.webhookEventsService.markAsFailed(deliveryId);
      throw error;
    }
  }
}
