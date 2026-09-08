import { Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import winston from "winston";
import { logger } from "../../shared/logging";
import { AuthRequest } from "./auth.middleware";
import { sanitize } from "../../shared/logging/sanitizer";

export interface AppRequest extends AuthRequest {
  id?: string;
  logger?: winston.Logger;
}

export const requestLogger = (
  req: AppRequest,
  res: Response,
  next: NextFunction,
): void => {
  const requestId = (req.headers["x-request-id"] as string) || randomUUID();
  req.id = requestId;

  res.setHeader("X-Request-ID", requestId);

  req.logger = logger.child({ requestId });

  req.logger.info("Request started", {
    method: req.method,
    path: req.path,
    query: sanitize(req.query),
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });

  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    req.logger?.info("Request completed", {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    });
  });

  next();
};
