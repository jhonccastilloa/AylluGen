import { Response, NextFunction } from "express";
import { AppRequest } from "./types";
import {
  BaseErrorHandler,
  ZodValidationErrorHandler,
  RawZodErrorHandler,
  AppErrorHandler,
  JwtTokenErrorHandler,
  JwtExpiredTokenErrorHandler,
  DefaultErrorHandler,
} from "./error-handlers/index";

const errorHandlers: BaseErrorHandler[] = [
  new ZodValidationErrorHandler(),
  new RawZodErrorHandler(),
  new AppErrorHandler(),
  new JwtTokenErrorHandler(),
  new JwtExpiredTokenErrorHandler(),
  new DefaultErrorHandler(),
];

export const errorHandler = (
  err: Error,
  req: AppRequest,
  res: Response,
  _next: NextFunction,
): void => {
  // Sync database errors may contain values from SQL parameters. Never log them.
  if (req.originalUrl?.startsWith("/api/sync/v2")) {
    const error = err as Error & {
      statusCode?: number;
      code?: string;
      type?: string;
      status?: number;
    };
    const jwtError = [
      "JsonWebTokenError",
      "TokenExpiredError",
      "NotBeforeError",
    ].includes(error.name);
    const status =
      error.statusCode ??
      (jwtError
        ? 401
        : error.name === "ZodError" || error.type === "entity.parse.failed"
          ? 400
          : error.status === 413
            ? 413
            : 500);
    req.logger?.warn("sync.request_failed", {
      statusCode: status,
      code: error.code ?? "SYNC_REQUEST_ERROR",
      userId: req.user?.userId,
    });
    res
      .status(status)
      .json({
        error:
          status === 500
            ? "Error interno de sincronización"
            : status === 400
              ? "Request de sincronización inválido"
              : error.message,
        code:
          error.code ??
          (status === 413 ? "SYNC_PAYLOAD_TOO_LARGE" : "SYNC_REQUEST_ERROR"),
      });
    return;
  }
  const handler = errorHandlers.find((h) => h.canHandle(err));
  handler?.handle(err, req, res);
};

export const notFoundHandler = (_req: AppRequest, res: Response): void => {
  res.status(404).json({
    error: "Route not found",
    code: "ROUTE_NOT_FOUND",
  });
};
