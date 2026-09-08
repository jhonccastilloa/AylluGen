import { Response } from "express";
import { AppRequest } from "../types";
import { AppError, ZodValidationError } from "../../../shared/errors/AppError";
import { config } from "../../../shared/constants/config";
import { logger } from "../../../shared/logging";
import { ZodError } from "zod";

const isDevelopment = config.nodeEnv === "development";

interface ErrorResponse {
  error: string;
  code: string;
  stack?: string;
  name?: string;
  isOperational?: boolean;
  details?: Array<{ path: string[]; message: string }>;
}

export abstract class BaseErrorHandler {
  abstract canHandle(err: Error): boolean;
  abstract handle(err: Error, req: AppRequest, res: Response): void;
}

export class ZodValidationErrorHandler extends BaseErrorHandler {
  canHandle(err: Error): boolean {
    return err instanceof ZodValidationError;
  }

  handle(err: Error, req: AppRequest, res: Response): void {
    const zodError = err as ZodValidationError;
    const requestLogger = req.logger || logger;

    requestLogger.error("Validation error occurred", {
      error: err,
      url: req.url,
      method: req.method,
      requestId: req.id,
    });

    const response: ErrorResponse = {
      error: zodError.message,
      code: zodError.code,
    };

    if (isDevelopment) {
      response.stack = zodError.stack;
      response.name = zodError.name;
      response.isOperational = zodError.isOperational;
    }

    if (isDevelopment || zodError.isOperational) {
      response.details = zodError.errors;
    }

    res.status(zodError.statusCode).json(response);
  }
}

export class RawZodErrorHandler extends BaseErrorHandler {
  canHandle(err: Error): boolean {
    return err.name === "ZodError" && !(err instanceof ZodValidationError);
  }

  handle(err: ZodError, req: AppRequest, res: Response): void {
    const requestLogger = req.logger || logger;

    requestLogger.error("Raw Zod validation error occurred", {
      error: err,
      url: req.url,
      method: req.method,
      requestId: req.id,
    });

    const errors = err.issues.map((issue) => ({
      path: issue.path.map(String),
      message: issue.message,
    }));

    const response: ErrorResponse = {
      error: "Invalid data provided",
      code: "VALIDATION_ERROR",
    };

    if (isDevelopment) {
      response.stack = err.stack;
      response.name = err.name;
    }

    response.details = errors;

    res.status(400).json(response);
  }
}

export class AppErrorHandler extends BaseErrorHandler {
  canHandle(err: Error): boolean {
    return err instanceof AppError && !(err instanceof ZodValidationError);
  }

  handle(err: Error, req: AppRequest, res: Response): void {
    const appError = err as AppError;
    const requestLogger = req.logger || logger;
    const isOperational = appError.isOperational;

    requestLogger.error("Application error occurred", {
      error: err,
      url: req.url,
      method: req.method,
      requestId: req.id,
    });

    const response: ErrorResponse = {
      error: appError.message,
      code: appError.code,
    };

    if (isDevelopment) {
      response.stack = appError.stack;
      response.name = appError.name;
      response.isOperational = isOperational;
    } else if (!isOperational) {
      response.error = "Internal server error";
      response.code = "INTERNAL_SERVER_ERROR";
    }

    res.status(appError.statusCode).json(response);
  }
}

export class JwtTokenErrorHandler extends BaseErrorHandler {
  canHandle(err: Error): boolean {
    return err.name === "JsonWebTokenError";
  }

  handle(err: Error, req: AppRequest, res: Response): void {
    const requestLogger = req.logger || logger;

    requestLogger.warn("JWT token error occurred", {
      error: err,
      url: req.url,
      method: req.method,
      requestId: req.id,
    });

    const response: ErrorResponse = {
      error: "Invalid token",
      code: "INVALID_TOKEN",
    };

    if (isDevelopment) {
      response.stack = err.stack;
      response.name = err.name;
    }

    res.status(401).json(response);
  }
}

export class JwtExpiredTokenErrorHandler extends BaseErrorHandler {
  canHandle(err: Error): boolean {
    return err.name === "TokenExpiredError";
  }

  handle(err: Error, req: AppRequest, res: Response): void {
    const requestLogger = req.logger || logger;

    requestLogger.warn("JWT token expired", {
      error: err,
      url: req.url,
      method: req.method,
      requestId: req.id,
    });

    const response: ErrorResponse = {
      error: "Token expired",
      code: "TOKEN_EXPIRED",
    };

    if (isDevelopment) {
      response.stack = err.stack;
      response.name = err.name;
    }

    res.status(401).json(response);
  }
}

export class DefaultErrorHandler extends BaseErrorHandler {
  canHandle(_err: Error): boolean {
    return true;
  }

  handle(err: Error, req: AppRequest, res: Response): void {
    const requestLogger = req.logger || logger;

    requestLogger.error("Unexpected error occurred", {
      error: err,
      url: req.url,
      method: req.method,
      requestId: req.id,
    });

    const response: ErrorResponse = {
      error: isDevelopment ? err.message : "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    };

    if (isDevelopment) {
      response.stack = err.stack;
      response.name = err.name;
      response.isOperational = false;
    }

    res.status(500).json(response);
  }
}
