import { InternalServerErrorException } from '@nestjs/common';

export class PullFailedException extends InternalServerErrorException {
  constructor(repositoryId: string, message?: string) {
    super(`Failed to pull repository ${repositoryId}: ${message || 'Unknown error'}`);
  }
}
