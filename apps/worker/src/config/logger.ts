/**
 * Worker Logger
 *
 * A thin structured-logging abstraction over `console` that formats output as
 * JSON-compatible objects in production and human-readable lines in development.
 *
 * Design intent:
 *   - Zero runtime dependencies in this phase (console only).
 *   - Interface mirrors `pino` so the implementation can be swapped out with
 *     a single file change once the worker handles real traffic.
 *   - All log entries include a `service` tag and ISO timestamp for easy
 *     filtering in log aggregation tools (Datadog, Loki, CloudWatch).
 */

export interface WorkerLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function formatEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): string {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    service: 'docpulse-worker',
    message,
    ...context,
  };
  return JSON.stringify(entry);
}

/**
 * Creates a structured logger for the DocPulse worker process.
 *
 * In development (`NODE_ENV !== 'production'`) log lines are emitted as JSON
 * to stdout/stderr which is still human-readable and easily piped to `jq`.
 * In production, the same format is compatible with most log shippers.
 */
export function createWorkerLogger(): WorkerLogger {
  return {
    info(message, context) {
      console.log(formatEntry('info', message, context));
    },

    warn(message, context) {
      console.warn(formatEntry('warn', message, context));
    },

    error(message, context) {
      console.error(formatEntry('error', message, context));
    },

    debug(message, context) {
      if (process.env['NODE_ENV'] !== 'production') {
        console.debug(formatEntry('debug', message, context));
      }
    },
  };
}
