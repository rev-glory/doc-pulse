import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RepositoryLockService {
  private readonly logger = new Logger(RepositoryLockService.name);
  private readonly locks = new Map<string, Promise<void>>();

  async acquireLock(repositoryId: string): Promise<() => void> {
    let releaseLock: () => void;

    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = () => {
        this.locks.delete(repositoryId);
        resolve();
      };
    });

    // Wait for any existing lock to be released
    const existingLock = this.locks.get(repositoryId);
    if (existingLock) {
      this.logger.debug(`Waiting for lock on repository ${repositoryId}`);
      await existingLock;
    }

    this.locks.set(repositoryId, lockPromise);
    this.logger.debug(`Acquired lock on repository ${repositoryId}`);

    return releaseLock!;
  }
}