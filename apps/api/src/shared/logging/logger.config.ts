import { config } from "../constants/config";
import { LogLevel, LogFormat } from "./types";

const isDevelopment = config.nodeEnv === "development";
const isProduction = config.nodeEnv === "production";
const isTest = config.nodeEnv === "test";

export const loggerConfig = {
  level:
    process.env.LOG_LEVEL ||
    ((isDevelopment ? "debug" : isTest ? "error" : "info") as LogLevel),
  format:
    process.env.LOG_FORMAT ||
    ((isDevelopment ? "pretty" : "json") as LogFormat),
  environment: config.nodeEnv,
  nodeEnv: config.nodeEnv,

  // Console transport
  console: {
    enabled: true,
    colors: isDevelopment,
    timestamp: true,
  },

  // File transport
  file: {
    enabled: isProduction || process.env.LOG_FILE_ENABLED === "true",
    path: process.env.LOG_FILE_PATH || "./logs",
    maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES || "14"), // 14 days (2 weeks)
    maxSize: process.env.LOG_FILE_MAX_SIZE || "20m",
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
  },

  // Error file (separate file for errors)
  errorFile: {
    enabled: isProduction || process.env.LOG_FILE_ENABLED === "true",
    level: "error" as LogLevel,
    maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES || "30"), // Keep errors longer
    maxSize: process.env.LOG_FILE_MAX_SIZE || "20m",
  },

  // Sampling
  sampling: {
    enabled: isProduction,
    sampleRate: 0.1, // 10% sampling for debug/verbose/silly logs
  },

  // Sanitization
  sanitization: {
    enabled: isProduction || process.env.LOG_SANITIZE === "true",
    sensitiveKeys: [
      "password",
      "pwd",
      "token",
      "secret",
      "apiKey",
      "accessToken",
      "refreshToken",
      "authorization",
      "cookie",
      "creditCard",
      "ssn",
      "dni",
      "email",
    ],
    replacement: "[REDACTED]",
  },

  // Request ID
  requestId: {
    header: process.env.REQUEST_ID_HEADER || "x-request-id",
    generate: !process.env.REQUEST_ID_HEADER, // Generate if header not specified
  },
};

export const LOG_LEVELS: Record<string, number> = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};
