import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { InstallationsPersistence } from '../persistence/installations.persistence';
import { InstallationResponseDto } from '../dto/installation-response.dto';
import type { Installation } from '@/generated/prisma/client';

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
  ) {}

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  /**
   * Return all installations persisted for a given DocPulse user.
   * Reads from the database only — no GitHub API call is made.
   */
  async getInstallationsForUser(userId: string): Promise<InstallationResponseDto[]> {
    this.logger.debug(`Fetching installations for user ${userId}`);
    const installations = await this.installationsPersistence.listByUser(userId);
    return installations.map((inst) => this.toResponseDto(inst));
  }

  /**
   * Find a single installation by its GitHub installation ID.
   * Throws NotFoundException if the installation is not in the database.
   */
  async getInstallationByGitHubId(installationId: number): Promise<Installation> {
    const installation = await this.installationsPersistence.findByInstallationId(installationId);
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
   *
   * If the sender has not yet logged into DocPulse, the userId will be null
   * and the installation is persisted without an owner for now. It will be
   * linked on the user's first login.
   */
  async handleInstallationCreated(payload: {
    installationId: number;
    accountLogin: string;
    accountType: string;
    userId: string;
  }): Promise<void> {
    const { installationId, accountLogin, accountType, userId } = payload;

    this.logger.log('Persisting new installation from webhook', {
      installationId,
      accountLogin,
      accountType,
      userId,
    });

    await this.installationsPersistence.upsertInstallation({
      installationId,
      accountLogin,
      accountType,
      isActive: true,
      userId,
    });

    this.logger.log(`Installation ${installationId} persisted successfully`);
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
