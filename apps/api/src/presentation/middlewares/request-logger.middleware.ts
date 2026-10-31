import { Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import type { ILogger } from "../../shared/logging/Logger";
import { AuthRequest } from "./auth.middleware";

export interface AppRequest extends AuthRequest {
  id?: string;
  logger?: ILogger;
}

export const makeRequestLogger =
  (logger: ILogger) =>
  (req: AppRequest, res: Response, next: NextFunction): void => {
    const suppliedId = req.headers["x-request-id"];
    const requestId =
      typeof suppliedId === "string" &&
      /^[A-Za-z0-9._-]{1,128}$/.test(suppliedId)
        ? suppliedId
        : randomUUID();
    req.id = requestId;

    res.setHeader("X-Request-ID", requestId);

    req.logger = logger.child({ requestId });

    req.logger.info("http.request_started", {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    const startTime = performance.now();

    res.on("finish", () => {
      const durationMs = performance.now() - startTime;
      req.logger?.info("http.request_completed", {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs,
      });
    });

    next();
  };
