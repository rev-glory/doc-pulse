import { Injectable } from "@nestjs/common";

import { PrismaService } from "@/database";
import type { Installation, Prisma } from "@/generated/prisma/client";

@Injectable()
export class InstallationsPersistence {
  constructor(private prisma: PrismaService) {}

  async upsertInstallation(
    data: {
      installationId: number;
      accountLogin: string;
      accountType: string;
      isActive: boolean;
      userId: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<{ installation: Installation; isNew: boolean }> {
    const client = tx || this.prisma;
    const existing = await client.installation.findUnique({
      where: { installationId: data.installationId },
    });

    const installation = await client.installation.upsert({
      where: { installationId: data.installationId },
      update: {
        accountLogin: data.accountLogin,
        accountType: data.accountType,
        isActive: data.isActive,
        userId: data.userId,
      },
      create: data,
    });

    return { installation, isNew: !existing };
  }

  async findByInstallationId(
    installationId: number,
  ): Promise<Installation | null> {
    return this.prisma.installation.findUnique({
      where: { installationId },
    });
  }

  async listByUser(userId: string): Promise<Installation[]> {
    return this.prisma.installation.findMany({
      where: { userId },
    });
  }

  async listAllInstallations(): Promise<Installation[]> {
    return this.prisma.installation.findMany();
  }

  /**
   * Mark an installation and all its associated repositories as inactive without deleting them.
   * Preserves historical WorkflowRun data that references this installation.
   */
  async deactivateInstallation(installationId: number): Promise<void> {
    const inst = await this.prisma.installation.findUnique({
      where: { installationId },
      select: { id: true },
    });

    if (inst) {
      await this.prisma.$transaction([
        this.prisma.installation.update({
          where: { id: inst.id },
          data: { isActive: false },
        }),
        this.prisma.repository.updateMany({
          where: { installationId: inst.id },
          data: { isActive: false },
        }),
      ]);
    }
  }
}
