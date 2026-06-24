import { ConflictException } from '@nestjs/common';

export class RepositoryAlreadyClonedException extends ConflictException {
  constructor(repositoryId: string) {
    super(`Repository ${repositoryId} is already cloned`);
  }
}
