import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';

import type { GitHubConfig } from '@/config';
import { PrismaService } from '@/database';
import { WebhookEventsService } from '@/modules/webhook-events/services/webhook-events.service';
// TODO(queue-infrastructure): Re-add JobDispatcher, JobName import once the Queue module is implemented.

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
    // TODO(queue-infrastructure): Re-add JobDispatcher injection once the Queue module is implemented.
    // private readonly jobDispatcher: JobDispatcher,
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
      // TODO(queue-infrastructure): Dispatch jobs to BullMQ once the Queue module is implemented.
      // The switch block below routes webhook events to the appropriate queue job.
      // Restore this when QueueModule and JobDispatcher are available.
      //
      // switch (event) {
      //   case 'installation':
      //     await this.jobDispatcher.dispatch({ name: JobName.WEBHOOK_INSTALLATION, data: rawPayload });
      //     break;
      //   case 'installation_repositories':
      //     await this.jobDispatcher.dispatch({ name: JobName.WEBHOOK_INSTALLATION_REPOSITORIES, data: rawPayload });
      //     break;
      //   case 'push':
      //     await this.jobDispatcher.dispatch({ name: JobName.WEBHOOK_PUSH, data: rawPayload });
      //     break;
      //   case 'pull_request':
      //     await this.jobDispatcher.dispatch({ name: JobName.WEBHOOK_PULL_REQUEST, data: rawPayload });
      //     break;
      //   default:
      //     this.logger.debug(`Unhandled webhook event: ${event} — ignoring`);
      // }
      this.logger.debug(`Webhook event received: ${event} — job dispatch pending Queue infrastructure`);

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
