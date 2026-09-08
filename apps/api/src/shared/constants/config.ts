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
};
