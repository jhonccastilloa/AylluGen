import type { NextFunction, Response } from "express";
import type { AppRequest } from "./request-logger.middleware";
import type { ILogger } from "../../shared/logging/Logger";
import { mapHttpError } from "../errors/mapHttpError";

export const makeErrorHandler = (logger: ILogger) =>
  function errorHandler(
    error: unknown,
    req: AppRequest,
    res: Response,
    next: NextFunction,
  ): void {
    if (res.headersSent) {
      next(error);
      return;
    }

    const result = mapHttpError(error);
    if (result.statusCode === 401) {
      res.setHeader("WWW-Authenticate", "Bearer");
    }
    if (result.statusCode >= 500) {
      // Do not serialize unknown exceptions: database errors can contain row data.
      (req.logger ?? logger).error("http.request_failed", {
        requestId: req.id,
        method: req.method,
        statusCode: result.statusCode,
        code: result.body.code,
        errorType: error instanceof Error ? error.name : typeof error,
      });
    }
    res.status(result.statusCode).json(result.body);
  };

export function notFoundHandler(_req: AppRequest, res: Response): void {
  res
    .status(404)
    .json({ error: "Ruta no encontrada.", code: "ROUTE_NOT_FOUND" });
}
