import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";

import { GitHubWebhookService } from "../services/github-webhook.service";

// ---------------------------------------------------------------------------
// GitHubWebhooksController
//
// Receives incoming GitHub webhook POST requests.
//
// Design decisions:
//   • No authentication guard — GitHub webhooks are authenticated by their
//     HMAC-SHA256 signature, not by DocPulse JWT. The signature is verified
//     in GitHubWebhookService before any payload is processed.
//   • Always returns 200 after signature verification passes. GitHub will
//     retry on non-2xx responses — we don't want retries for processing
//     failures that are our own bugs.
//   • Raw body is required for HMAC verification. NestFactory must be
//     created with `{ rawBody: true }` in main.ts.
// ---------------------------------------------------------------------------

@ApiTags("Webhooks")
@Controller("github")
export class GitHubWebhooksController {
  private readonly logger = new Logger(GitHubWebhooksController.name);

  constructor(private readonly gitHubWebhookService: GitHubWebhookService) {}

  @Post(["webhooks", "webhook"])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Receive GitHub App webhook events" })
  @ApiResponse({
    status: 200,
    description: "Event received and queued for processing",
  })
  @ApiResponse({ status: 401, description: "Invalid webhook signature" })
  async handleWebhook(
    @Req() req: Request,
    @Headers("x-github-event") event: string,
    @Headers("x-github-delivery") deliveryId: string,
    @Headers("x-hub-signature-256") signature: string,
  ): Promise<{ received: boolean }> {
    const body = req.body || {};
    const instId = body?.installation?.id;
    const repoId = body?.repository?.id;

    this.logger.log({
      message: "Received GitHub webhook",
      event,
      delivery: deliveryId,
      installationId: instId,
      repositoryId: repoId,
    });

    // `rawBody` is available when the app is bootstrapped with rawBody: true.
    // We cast here — if it's missing, the signature check will fail and we
    // return 401 before processing any payload.
    const rawBody = (req as any).rawBody as Buffer | undefined;

    if (!rawBody) {
      this.logger.error(
        "rawBody not available — ensure NestFactory.create is called with { rawBody: true }",
      );
      throw new UnauthorizedException(
        "Webhook signature could not be verified",
      );
    }

    const isValid = this.gitHubWebhookService.verifySignature(
      rawBody,
      signature,
    );

    if (!isValid) {
      this.logger.warn(
        `Webhook signature verification failed for event: ${event}`,
      );
      throw new UnauthorizedException("Invalid webhook signature");
    }

    this.logger.log({
      message: "Webhook signature validated",
      event,
      delivery: deliveryId,
    });

    // Process asynchronously — do not await so we return 200 immediately.
    // GitHub expects a fast acknowledgement; long processing happens in the
    // background (BullMQ jobs for push/PR events).
    void this.gitHubWebhookService
      .handleEvent(event, deliveryId, req.body)
      .catch((error) => {
        this.logger.error(`Webhook handler failed for event: ${event}`, error);
      });

    return { received: true };
  }
}
