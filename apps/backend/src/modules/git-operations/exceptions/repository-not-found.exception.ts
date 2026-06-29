import { NotFoundException } from "@nestjs/common";

export class RepositoryNotFoundException extends NotFoundException {
  constructor(repositoryId: string) {
    super(`Repository ${repositoryId} not found in storage`);
  }
}
