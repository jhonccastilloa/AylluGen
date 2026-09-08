export abstract class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly type: string;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    type: string,
    isOperational = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.type = type;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Validation error") {
    super(message, 400, "VALIDATION_ERROR", "ValidationError");
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed") {
    super(message, 401, "AUTHENTICATION_ERROR", "AuthenticationError");
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Not authorized") {
    super(message, 403, "AUTHORIZATION_ERROR", "AuthorizationError");
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND", "NotFoundError");
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists") {
    super(message, 409, "CONFLICT", "ConflictError");
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = "Internal server error") {
    super(message, 500, "INTERNAL_SERVER_ERROR", "InternalServerError", false);
  }
}

export class ZodValidationError extends AppError {
  constructor(
    public readonly errors: Array<{ path: string[]; message: string }>,
  ) {
    super(
      "Invalid data provided",
      400,
      "VALIDATION_ERROR",
      "ZodValidationError",
      true,
    );
  }
}
