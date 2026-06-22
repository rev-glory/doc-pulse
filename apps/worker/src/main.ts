/**
 * DocPulse Worker — Entry Point
 *
 * Bootstraps the worker process, registers OS signal handlers for graceful
 * shutdown, and keeps the event loop alive until a termination signal is
 * received. BullMQ consumers and processors will be registered here once the
 * queue infrastructure is introduced.
 */

import { createWorkerLogger } from './config/logger.js';

const logger = createWorkerLogger();

/**
 * Tracks whether a shutdown has already been initiated so that duplicate
 * signals (e.g. SIGINT pressed twice) do not trigger the teardown twice.
 */
let isShuttingDown = false;

/**
 * Performs a graceful shutdown of the worker.
 *
 * Future teardown steps (closing BullMQ connections, draining in-flight jobs,
 * closing the Redis client) will be awaited here before the process exits.
 */
async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Initiating graceful shutdown…`);

  try {
    // ── Future teardown hooks go here ─────────────────────────────────────
    // await bullmqWorker.close();
    // await redisClient.quit();
    // ──────────────────────────────────────────────────────────────────────

    logger.info('Worker shut down cleanly.');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
}

/**
 * Bootstraps the DocPulse Worker.
 *
 * Initialisation order:
 *   1. Log startup banner.
 *   2. Register OS signal handlers (SIGINT / SIGTERM).
 *   3. Start a keep-alive interval so the event loop does not drain while
 *      waiting for queue jobs.
 *   4. (Future) Register BullMQ consumers.
 */
async function bootstrap(): Promise<void> {
  logger.info('🚀 DocPulse Worker Started');
  logger.info('Environment', {
    nodeVersion: process.version,
    nodeEnv: process.env['NODE_ENV'] ?? 'development',
    pid: process.pid,
  });

  // ── Signal Handlers ──────────────────────────────────────────────────────
  // Handle both Ctrl-C (SIGINT) and container / process-manager termination
  // (SIGTERM) so the worker drains in-flight jobs before exiting.
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  // ── Unhandled Rejection Guard ────────────────────────────────────────────
  // Prevent silent failures in async code from going unnoticed.
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection — this is a bug', { reason });
    // Do not exit here; let the process continue so in-flight jobs can finish.
  });

  // ── Keep-Alive ───────────────────────────────────────────────────────────
  // Without active I/O or timers, Node.js will exit immediately. This interval
  // keeps the event loop running until SIGINT / SIGTERM is received.
  // It will be replaced by an active BullMQ connection in the next phase.
  const keepAlive = setInterval(() => {
    // Intentionally empty — BullMQ connection will replace this.
  }, 30_000);

  // Allow the process to exit even if this timer is still pending so that
  // our shutdown() handler fully controls the exit path.
  keepAlive.unref();

  logger.info('Worker is ready and waiting for jobs.');
}

void bootstrap();
