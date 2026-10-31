import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().min(1).max(65535).default(3000),
  DATABASE_URL: z.url("DATABASE_URL must be a valid URL"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  REFRESH_TOKEN_SECRET: z
    .string()
    .min(32, "REFRESH_TOKEN_SECRET must be at least 32 characters")
    .optional(),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
  LOG_LEVEL: z
    .enum(["error", "warn", "info", "http", "verbose", "debug", "silly"])
    .optional(),
  LOG_FILE_ENABLED: z.enum(["true", "false"]).optional(),
  LOG_FILE_PATH: z.string().min(1).default("./logs"),
  LOG_FILE_MAX_FILES: z
    .string()
    .regex(/^[1-9]\d*d?$/)
    .default("14d"),
  LOG_FILE_MAX_SIZE: z
    .string()
    .regex(/^[1-9]\d*[kmg]$/i)
    .default("20m"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const errors = parsedEnv.error.issues
    .map((e) => `- ${e.path.join(".")}: ${e.message}`)
    .join("\n");
  throw new Error(`❌ Invalid environment variables:\n${errors}`);
}

export const config = {
  port: parsedEnv.data.PORT,
  nodeEnv: parsedEnv.data.NODE_ENV,
  jwtSecret: parsedEnv.data.JWT_SECRET,
  jwtRefreshSecret:
    parsedEnv.data.REFRESH_TOKEN_SECRET || parsedEnv.data.JWT_SECRET,
  jwtExpiresIn: parsedEnv.data.JWT_EXPIRES_IN,
  refreshTokenExpiresIn: parsedEnv.data.REFRESH_TOKEN_EXPIRES_IN,
  databaseUrl: parsedEnv.data.DATABASE_URL,
  isProd: parsedEnv.data.NODE_ENV === "production",
  logging: {
    environment: parsedEnv.data.NODE_ENV,
    level:
      parsedEnv.data.LOG_LEVEL ??
      (parsedEnv.data.NODE_ENV === "development"
        ? "debug"
        : parsedEnv.data.NODE_ENV === "test"
          ? "error"
          : "info"),
    fileEnabled:
      parsedEnv.data.LOG_FILE_ENABLED === undefined
        ? parsedEnv.data.NODE_ENV === "production"
        : parsedEnv.data.LOG_FILE_ENABLED === "true",
    filePath: parsedEnv.data.LOG_FILE_PATH,
    maxFiles: parsedEnv.data.LOG_FILE_MAX_FILES.endsWith("d")
      ? parsedEnv.data.LOG_FILE_MAX_FILES
      : Number(parsedEnv.data.LOG_FILE_MAX_FILES),
    maxSize: parsedEnv.data.LOG_FILE_MAX_SIZE,
  },
};

export type LoggingConfig = typeof config.logging;
