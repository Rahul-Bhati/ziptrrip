/**
 * Application errors.
 *
 * Services throw these; the error-handling middleware (step 4) turns them
 * into HTTP responses. Services therefore never touch `res` or status codes
 * directly: they only say WHAT went wrong, the HTTP layer decides HOW to send it.
 */

/** One problem found while validating input */
export interface ValidationIssue {
  /** Which field the problem is about, e.g. "title" (absent for whole-body problems) */
  field?: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    message: string,
    /** HTTP status code to respond with */
    public readonly statusCode: number,
    /** Stable machine-readable code that clients can check, e.g. "NOT_FOUND" */
    public readonly code: string,
    public readonly details?: ValidationIssue[],
  ) {
    super(message);
    // Shows the subclass name ("NotFoundError") in logs and stack traces
    this.name = new.target.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(details: ValidationIssue[]) {
    super("Validation failed", 400, "VALIDATION_ERROR", details);
  }
}
