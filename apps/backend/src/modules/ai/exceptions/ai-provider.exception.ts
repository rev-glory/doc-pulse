// ---------------------------------------------------------------------------
// AIProviderException
//
// Thrown when an underlying SDK call fails at runtime.
//
// Wraps SDK-specific errors (GoogleGenerativeAIError, network failures, etc.)
// so that consumers never see SDK internals. All error details are accessible
// via the standard Error.cause property for logging.
//
// Examples of causes:
//   • API key rejected (401)
//   • Model quota exceeded (429)
//   • Safety filter blocked the prompt
//   • Network timeout
// ---------------------------------------------------------------------------

export class AIProviderException extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AIProviderException';
    this.cause = cause;

    // Maintains proper stack trace in V8 (Node.js).
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIProviderException);
    }
  }
}
