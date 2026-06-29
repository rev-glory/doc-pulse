import { InternalServerErrorException } from "@nestjs/common";

export class CloneFailedException extends InternalServerErrorException {
  constructor(repositoryId: string, message?: string, cause?: unknown) {
    super(
      `Failed to clone repository ${repositoryId}: ${message || "Unknown error"}`,
      { cause },
    );
  }
}
