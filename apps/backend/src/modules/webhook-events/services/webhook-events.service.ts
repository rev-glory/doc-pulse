import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "@/database";

// ---------------------------------------------------------------------------
// WebhookEventsService
//
// Responsibilities:
//   - Persist incoming GitHub webhook events
//   - Update event status after processing
// ---------------------------------------------------------------------------

@Injectable()
export class WebhookEventsService {
  private readonly logger = new Logger(WebhookEventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persist a new webhook event to the database.
   */
  async createEvent({
    githubDeliveryId,
    eventType,
    action,
    repositoryId,
    payload,
  }: {
    githubDeliveryId: string;
    eventType: string;
    action?: string;
    repositoryId?: string;
    payload: unknown;
  }) {
    this.logger.log("Persisting webhook event", {
      githubDeliveryId,
      eventType,
      action,
      repositoryId,
    });

    return this.prisma.webhookEvent.create({
      data: {
        githubDeliveryId,
        eventType,
        action,
        repositoryId,
        payload: payload as any,
        status: "RECEIVED",
      },
    });
  }

  /**
   * Mark an event as processed successfully.
   */
  async markAsProcessed(githubDeliveryId: string) {
    this.logger.log("Marking webhook event as processed", { githubDeliveryId });

    return this.prisma.webhookEvent.update({
      where: { githubDeliveryId },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
      },
    });
  }

  /**
   * Mark an event as failed.
   */
  async markAsFailed(githubDeliveryId: string) {
    this.logger.log("Marking webhook event as failed", { githubDeliveryId });

    return this.prisma.webhookEvent.update({
      where: { githubDeliveryId },
      data: {
        status: "FAILED",
        processedAt: new Date(),
      },
    });
  }
}
