import { Request, Response } from "express";
import { prisma } from "../../infrastructure/database/prisma/client";
import { config } from "../../shared/constants/config";

export interface HealthCheckResponse {
  status: "healthy" | "unhealthy";
  timestamp: string;
  uptime: number;
  environment: string;
  database: {
    status: "connected" | "disconnected";
    latency?: number;
  };
}

export const healthCheck = async (_req: Request, res: Response) => {
  const startTime = Date.now();
  let dbStatus: "connected" | "disconnected" = "disconnected";
  let dbLatency: number | undefined = undefined;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
    dbLatency = Date.now() - startTime;
  } catch (error) {
    dbStatus = "disconnected";
  }

  const response: HealthCheckResponse = {
    status: dbStatus === "connected" ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    database: {
      status: dbStatus,
      latency: dbLatency,
    },
  };

  const statusCode = response.status === "healthy" ? 200 : 503;

  res.status(statusCode).json(response);
};

export const readyCheck = async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ready" });
  } catch (error) {
    res.status(503).json({ status: "not ready" });
  }
};

export const liveCheck = async (_req: Request, res: Response) => {
  res.status(200).json({ status: "alive" });
};
