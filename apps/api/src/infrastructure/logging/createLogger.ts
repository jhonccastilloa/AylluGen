import { hostname } from "node:os";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import type { LoggingConfig } from "../../shared/constants/config";
import { sanitize } from "./sanitizeMetadata";

export function createLogger(options: LoggingConfig): winston.Logger {
  const development = options.environment === "development";
  const level = options.level;
  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: development
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(
              ({ timestamp, level, message, ...metadata }) =>
                `${timestamp} [${level}]: ${message} ${JSON.stringify(metadata)}`,
            ),
          )
        : winston.format.json(),
    }),
  ];

  if (options.fileEnabled) {
    for (const name of ["application", "error"] as const) {
      transports.push(
        new DailyRotateFile({
          filename: `${options.filePath}/${name}-%DATE%.log`,
          datePattern: "YYYY-MM-DD",
          zippedArchive: true,
          maxSize: options.maxSize,
          maxFiles: options.maxFiles,
          level: name === "error" ? "error" : level,
          format: winston.format.json(),
        }),
      );
    }
  }

  return winston.createLogger({
    level,
    defaultMeta: {
      environment: options.environment,
      host: hostname(),
      pid: process.pid,
    },
    format: winston.format.combine(
      winston.format((info) => {
        // Keep Winston's symbol fields while replacing all enumerable metadata.
        const cleaned = sanitize(info) as Record<string, unknown>;
        for (const key of Object.keys(info)) delete info[key];
        return Object.assign(info, cleaned);
      })(),
      winston.format.timestamp(),
    ),
    transports,
  });
}
