import winston from "winston";
import { config } from "../constants/config";
import { loggerConfig } from "./logger.config";
import { createConsoleTransport } from "./transports/console.transport";
import {
  createFileTransport,
  createErrorFileTransport,
} from "./transports/file.transport";

class Logger {
  private static instance: winston.Logger | null = null;
  private static baseMetadata = {
    environment: config.nodeEnv,
    host: require("os").hostname(),
    pid: process.pid,
  };

  private constructor() {}

  public static getInstance(): winston.Logger {
    if (!Logger.instance) {
      const transports: winston.transport[] = [];

      // Always add console transport
      transports.push(createConsoleTransport());

      // Add file transports in production or if enabled
      if (loggerConfig.file.enabled) {
        transports.push(createFileTransport());
        transports.push(createErrorFileTransport());
      }

      Logger.instance = winston.createLogger({
        level: loggerConfig.level,
        defaultMeta: Logger.baseMetadata,
        transports,
        // exceptionHandlers: transports.filter(
        //   (t) => t instanceof winston.transports.Console,
        // ),
        // rejectionHandlers: transports.filter(
        //   (t) => t instanceof winston.transports.Console,
        // ),
        
      });
    }

    return Logger.instance;
  }

  public static child(metadata: Record<string, unknown>): winston.Logger {
    return this.getInstance().child(metadata);
  }

  public static info(message: string, metadata?: Record<string, unknown>): void {
    this.getInstance().info(message, metadata);
  }

  public static warn(message: string, metadata?: Record<string, unknown>): void {
    this.getInstance().warn(message, metadata);
  }

  public static error(
    message: string,
    error?: Error | Record<string, unknown>,
  ): void {
    if (error instanceof Error) {
      this.getInstance().error(message, {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    } else {
      this.getInstance().error(message, error);
    }
  }

  public static debug(message: string, metadata?: Record<string, unknown>): void {
    this.getInstance().debug(message, metadata);
  }
}

export const logger = Logger.getInstance();
export { Logger };
