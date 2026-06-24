import { InternalServerErrorException } from '@nestjs/common';

export class CheckoutFailedException extends InternalServerErrorException {
  constructor(repositoryId: string, ref: string, message?: string) {
    super(`Failed to checkout ${ref} for repository ${repositoryId}: ${message || 'Unknown error'}`);
  }
}
