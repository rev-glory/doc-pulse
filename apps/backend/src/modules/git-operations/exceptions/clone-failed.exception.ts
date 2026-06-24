import { InternalServerErrorException } from '@nestjs/common';

export class CloneFailedException extends InternalServerErrorException {
  constructor(repositoryId: string, message?: string) {
    super(`Failed to clone repository ${repositoryId}: ${message || 'Unknown error'}`);
  }
}
