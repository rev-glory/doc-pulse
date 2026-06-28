import { InternalServerErrorException } from '@nestjs/common';

export class PullFailedException extends InternalServerErrorException {
  constructor(repositoryId: string, message?: string, cause?: unknown) {
    super(`Failed to pull repository ${repositoryId}: ${message || 'Unknown error'}`, { cause });
  }
}
