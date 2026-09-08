import winston from "winston";
import { loggerConfig } from "../logger.config";

export const createConsoleTransport =
  (): winston.transports.ConsoleTransportInstance => {
    const isDevelopment = loggerConfig.nodeEnv === "development";

    return new winston.transports.Console({
      level: loggerConfig.level,
      format: isDevelopment
        ? winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            winston.format.errors({ stack: true }),
            winston.format.printf(
              ({ timestamp, level, message, ...metadata }) => {
                const metaString =
                  Object.keys(metadata).length > 0
                    ? `\n${JSON.stringify(metadata, null, 2)}`
                    : "";

                return `${timestamp} [${level}]: ${message}${metaString}`;
              },
            ),
          )
        : winston.format.combine(
            winston.format.timestamp({ format: "iso" }),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
    });
  };
