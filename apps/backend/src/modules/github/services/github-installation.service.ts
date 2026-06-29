import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";

import { InstallationsPersistence } from "../persistence/installations.persistence";
import { InstallationResponseDto } from "../dto/installation-response.dto";
import type { Installation } from "@/generated/prisma/client";
import { PrismaService } from "@/database";

// ---------------------------------------------------------------------------
// GitHubInstallationService
//
// Owns installation business logic:
//   • Serving persisted installations to the API layer
//   • Handling installation webhook events (created / deleted)
//
// The database is the source of truth for all installation state.
// Installation records are created by the installation webhook handler —
// never by polling GitHub with an OAuth token.
//
// Consumed by:
//   • GitHubInstallationsController (GET /github/installations)
//   • GitHubWebhookService (installation events)
// ---------------------------------------------------------------------------

@Injectable()
export class GitHubInstallationService {
  private readonly logger = new Logger(GitHubInstallationService.name);

  constructor(
    private readonly installationsPersistence: InstallationsPersistence,
    private readonly prisma: PrismaService,
  ) {}

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  /**
   * Return all installations persisted for a given DocPulse user.
   * Reads from the database only — no GitHub API call is made.
   */
  async getInstallationsForUser(
    userId: string,
  ): Promise<InstallationResponseDto[]> {
    this.logger.log("Returning installation list");
    this.logger.debug(`Fetching installations for user ${userId}`);
    const installations =
      await this.installationsPersistence.listByUser(userId);
    return installations.map((inst) => this.toResponseDto(inst));
  }

  /**
   * Find a single installation by its GitHub installation ID.
   * Throws NotFoundException if the installation is not in the database.
   */
  async getInstallationByGitHubId(
    installationId: number,
  ): Promise<Installation> {
    const installation =
      await this.installationsPersistence.findByInstallationId(installationId);
    if (!installation) {
      throw new NotFoundException(`Installation ${installationId} not found`);
    }
    return installation;
  }

  // ---------------------------------------------------------------------------
  // Webhook Handlers
  // ---------------------------------------------------------------------------

  /**
   * Handle the `installation` webhook event with action `created`.
   *
   * The webhook payload identifies the sender (the GitHub user who installed
   * the app). We map sender.githubId → User.githubId to associate the
   * installation with a DocPulse user.
   */
  async handleInstallationCreated(payload: any): Promise<void> {
    this.logger.log("Processing installation.created");

    const installationId = payload?.installation?.id;
    const accountLogin =
      payload?.account?.login || payload?.installation?.account?.login;
    const accountType =
      payload?.account?.type || payload?.installation?.account?.type;
    const senderId = payload?.sender?.id || payload?.installation?.account?.id;

    if (!installationId || !accountLogin || !accountType || !senderId) {
      this.logger.error("Invalid payload fields in handleInstallationCreated", {
        installationId,
        accountLogin,
        accountType,
        senderId,
      });
      return;
    }

    this.logger.log("Finding user");
    const user = await this.prisma.user.findUnique({
      where: { githubId: Number(senderId) },
    });

    if (!user) {
      this.logger.warn(
        `User not found for githubId: ${senderId}. Installation cannot be linked.`,
      );
      return;
    }

    this.logger.log("User found");

    const existing = await this.installationsPersistence.findByInstallationId(
      Number(installationId),
    );
    if (existing) {
      this.logger.log("Updating installation");
    } else {
      this.logger.log("Creating installation");
    }

    this.logger.log("Saving installation");

    const { installation } =
      await this.installationsPersistence.upsertInstallation({
        installationId: Number(installationId),
        accountLogin: String(accountLogin),
        accountType: String(accountType),
        isActive: true,
        userId: user.id,
      });

    this.logger.log("Installation saved");
    this.logger.log(`Installation ID: ${installation.id}`);
    this.logger.log(`GitHub Installation ID: ${installation.installationId}`);
    this.logger.log(`Owner User ID: ${installation.userId}`);
    this.logger.log(`GitHub Account Login: ${installation.accountLogin}`);
  }

  /**
   * Handle the `installation` webhook event with action `deleted`.
   *
   * Marks the installation as inactive in the database.
   * We do not delete the record so that historical WorkflowRun data
   * (which references the installation) is preserved.
   */
  async handleInstallationDeleted(installationId: number): Promise<void> {
    this.logger.log(`Marking installation ${installationId} as inactive`);
    await this.installationsPersistence.deactivateInstallation(installationId);
    this.logger.log(`Installation ${installationId} deactivated`);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private toResponseDto(installation: Installation): InstallationResponseDto {
    return plainToInstance(InstallationResponseDto, installation, {
      excludeExtraneousValues: true,
    });
  }
}
