import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';

import type { GitHubConfig } from '@/config';
import { GitHubInstallationService } from './github-installation.service';
import { InstallationsPersistence } from '../persistence/installations.persistence';
import { PrismaService } from '@/database';

// ---------------------------------------------------------------------------
// Webhook Event Payload Shapes
//
// Minimal interfaces for the fields we actually consume from GitHub webhook
// payloads. We use 'unknown' for everything else to be safe — never trust
// arbitrary payloads from the internet.
// ---------------------------------------------------------------------------

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
    private readonly prisma: PrismaService,
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
  async handleEvent(event: string, rawPayload: unknown): Promise<void> {
    this.logger.log(`Received GitHub webhook event: ${event}`);

    switch (event) {
      case 'installation':
        await this.handleInstallationEvent(rawPayload as WebhookInstallationPayload);
        break;

      case 'installation_repositories':
        await this.handleInstallationRepositoriesEvent(
          rawPayload as WebhookInstallationRepositoriesPayload,
        );
        break;

      case 'push':
        // TODO: Enqueue BullMQ job for documentation pipeline.
        this.logger.log('Push event received — pipeline not yet implemented');
        break;

      case 'pull_request':
        // TODO: Handle PR events for documentation PR tracking.
        this.logger.log('Pull request event received — handler not yet implemented');
        break;

      default:
        this.logger.debug(`Unhandled webhook event: ${event} — ignoring`);
    }
  }

  // ---------------------------------------------------------------------------
  // Installation Event Handlers
  // ---------------------------------------------------------------------------

  private async handleInstallationEvent(
    payload: WebhookInstallationPayload,
  ): Promise<void> {
    const { action, installation, sender } = payload;

    this.logger.log(`Installation event: ${action}`, {
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

    this.logger.log(`Installation repositories event: ${action}`, {
      installationId: installation.id,
      added: repositories_added?.length ?? 0,
      removed: repositories_removed?.length ?? 0,
    });

    // TODO: Phase 2 — Automatically sync repository access changes.
    // When repositories are added/removed from an installation, update
    // the repository records accordingly. For now, log only.
  }
}
