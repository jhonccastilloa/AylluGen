import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { loggerConfig } from "../logger.config";

export const createFileTransport = (): DailyRotateFile => {
  return new DailyRotateFile({
    filename: `${loggerConfig.file.path}/application-%DATE%.log`,
    datePattern: loggerConfig.file.datePattern,
    zippedArchive: loggerConfig.file.zippedArchive,
    maxSize: loggerConfig.file.maxSize,
    maxFiles: loggerConfig.file.maxFiles,
    level: loggerConfig.level,
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
  });
};

export const createErrorFileTransport = (): DailyRotateFile => {
  return new DailyRotateFile({
    filename: `${loggerConfig.file.path}/error-%DATE%.log`,
    datePattern: loggerConfig.file.datePattern,
    zippedArchive: loggerConfig.file.zippedArchive,
    maxSize: loggerConfig.errorFile.maxSize,
    maxFiles: loggerConfig.errorFile.maxFiles,
    level: loggerConfig.errorFile.level,
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
  });
};
