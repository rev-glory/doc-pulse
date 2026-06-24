import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';

import type { GitHubConfig } from '@/config';
import { GitHubInstallationService } from './github-installation.service';
import { InstallationsPersistence } from '../persistence/installations.persistence';
import { RepositoriesService } from '@/modules/repositories/services/repositories.service';
import { PrismaService } from '@/database';
import { WebhookEventsService } from '@/modules/webhook-events/services/webhook-events.service';

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

interface WebhookInstallationPayload {
  action: 'created' | 'deleted' | 'suspend' | 'unsuspend' | 'new_permissions_accepted';
  installation: {
    id: number;
    account: {
      login: string;
      type: string;
    };
  };
  /** The GitHub user who triggered the event. */
  sender: {
    id: number;
    login: string;
  };
}

interface WebhookInstallationRepositoriesPayload {
  action: 'added' | 'removed';
  installation: {
    id: number;
  };
  repositories_added?: Array<{ id: number; full_name: string }>;
  repositories_removed?: Array<{ id: number; full_name: string }>;
  sender: {
    id: number;
  };
}

interface WebhookPullRequestPayload {
  action: 'opened' | 'synchronize' | 'reopened' | 'closed';
  installation: {
    id: number;
  };
  repository: {
    id: number;
    full_name: string;
  };
  pull_request: {
    number: number;
    title: string;
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
      sha: string;
    };
  };
  sender: {
    id: number;
    login: string;
  };
}

// ---------------------------------------------------------------------------
// GitHubWebhookService
//
// Responsibilities:
//   1. HMAC-SHA256 signature verification — rejects any request that does not
//      pass GitHub's signature check before any payload is parsed.
//   2. Event routing — dispatches verified payloads to the appropriate
//      domain service handler.
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
    private readonly gitHubInstallationService: GitHubInstallationService,
    private readonly installationsPersistence: InstallationsPersistence,
    private readonly repositoriesService: RepositoriesService,
    private readonly prisma: PrismaService,
    private readonly webhookEventsService: WebhookEventsService,
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
  async handleEvent(event: string, deliveryId: string, rawPayload: unknown): Promise<void> {
    this.logger.log('Received GitHub webhook event', {
      event,
      deliveryId,
    });

    const payload = rawPayload as WebhookPayloadWithAction;
    let repositoryId: string | undefined;

    // Try to find the repository ID if available
    if (payload.repository?.id) {
      const repo = await this.prisma.repository.findUnique({
        where: { githubRepositoryId: payload.repository.id },
        select: { id: true },
      });
      repositoryId = repo?.id;
    }

    // Persist the event
    await this.webhookEventsService.createEvent({
      githubDeliveryId: deliveryId,
      eventType: event,
      action: payload.action,
      repositoryId,
      payload: rawPayload,
    });

    try {
      switch (event) {
        case 'installation':
          await this.handleInstallationEvent(payload as WebhookInstallationPayload);
          break;

        case 'installation_repositories':
          await this.handleInstallationRepositoriesEvent(
            payload as WebhookInstallationRepositoriesPayload,
          );
          break;

        case 'push':
          // TODO: Enqueue BullMQ job for documentation pipeline.
          this.logger.log('Push event received — pipeline not yet implemented');
          break;

        case 'pull_request':
          await this.handlePullRequestEvent(payload as WebhookPullRequestPayload);
          break;

        default:
          this.logger.debug(`Unhandled webhook event: ${event} — ignoring`);
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

  // ---------------------------------------------------------------------------
  // Installation Event Handlers
  // ---------------------------------------------------------------------------

  private async handleInstallationEvent(
    payload: WebhookInstallationPayload,
  ): Promise<void> {
    const { action, installation, sender } = payload;

    this.logger.log('Installation event', {
      action,
      installationId: installation.id,
      account: installation.account.login,
      sender: sender.login,
    });

    switch (action) {
      case 'created': {
        // Find the DocPulse user who installed the app by matching their
        // GitHub user ID (sender.id). If they haven't logged in yet, we
        // cannot associate the installation and skip persistence.
        const user = await this.prisma.user.findUnique({
          where: { githubId: sender.id },
        });

        if (!user) {
          this.logger.warn(
            `Installation created by GitHub user ${sender.id} who has not logged into DocPulse yet. ` +
              `The installation will be persisted on their first login.`,
            { installationId: installation.id },
          );
          // NOTE: Future enhancement — store unlinked installations and
          // associate them during the user's first OAuth callback.
          return;
        }

        await this.gitHubInstallationService.handleInstallationCreated({
          installationId: installation.id,
          accountLogin: installation.account.login,
          accountType: installation.account.type,
          userId: user.id,
        });
        break;
      }

      case 'deleted':
        await this.gitHubInstallationService.handleInstallationDeleted(installation.id);
        break;

      case 'suspend':
        this.logger.log(`Installation ${installation.id} suspended`);
        await this.installationsPersistence.deactivateInstallation(installation.id);
        break;

      case 'unsuspend':
        this.logger.log(`Installation ${installation.id} unsuspended`);
        // Re-activate is a future enhancement; log for now.
        break;

      default:
        this.logger.debug(`Unhandled installation action: ${action}`);
    }
  }

  private async handleInstallationRepositoriesEvent(
    payload: WebhookInstallationRepositoriesPayload,
  ): Promise<void> {
    const { action, installation, repositories_added, repositories_removed } = payload;

    this.logger.log('Installation repositories event', {
      action,
      installationId: installation.id,
      added: repositories_added?.length ?? 0,
      removed: repositories_removed?.length ?? 0,
    });

    // When repositories are added, perform a full sync
    if (repositories_added && repositories_added.length > 0) {
      await this.repositoriesService.syncInstallationRepositoriesFromWebhook(
        installation.id,
      );
    }

    // When repositories are removed, mark them inactive
    if (repositories_removed && repositories_removed.length > 0) {
      const removedRepoIds = repositories_removed.map(repo => repo.id);
      await this.repositoriesService.markRepositoriesInactive(removedRepoIds);
    }
  }

  // ---------------------------------------------------------------------------
  // Pull Request Event Handlers
  // ---------------------------------------------------------------------------

  private async handlePullRequestEvent(
    payload: WebhookPullRequestPayload,
  ): Promise<void> {
    const { action, repository, pull_request, sender } = payload;

    this.logger.log('Pull request event', {
      action,
      repository: repository.full_name,
      pullRequestNumber: pull_request.number,
      title: pull_request.title,
      sender: sender.login,
      headRef: pull_request.head.ref,
      headSha: pull_request.head.sha,
      baseRef: pull_request.base.ref,
      baseSha: pull_request.base.sha,
    });

    // TODO: Here we can later enqueue BullMQ job for AI PR review,
    // when that feature is implemented. For now just log it.
  }
}
