// ---------------------------------------------------------------------------
// AIConfigurationException
//
// Thrown when the AI module cannot initialise due to invalid or missing
// configuration (e.g. GEMINI_API_KEY not set, invalid model name).
//
// This is a programming/deployment error — it should surface at startup,
// not during a request cycle.
//
// Extends Error (not NestJS HttpException) because this is a domain exception,
// not an HTTP-layer concern. The global exception filter maps it to a 500 if
// it ever reaches the request pipeline, but it should normally be caught at
// module initialisation.
// ---------------------------------------------------------------------------

export class AIConfigurationException extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "AIConfigurationException";
    this.cause = cause;

    // Maintains proper stack trace in V8 (Node.js).
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIConfigurationException);
    }
  }
}
