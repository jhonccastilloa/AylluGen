import { config } from "./config";

export const TOKEN_CONFIG = {
  ACCESS_TOKEN: {
    expiresIn: config.jwtExpiresIn,
    secret: config.jwtSecret,
  },
  REFRESH_TOKEN: {
    expiresIn: config.refreshTokenExpiresIn,
    secret: config.jwtRefreshSecret,
    days: 7,
  },
} as const;

export function getRefreshTokenExpirationDays(): number {
  return TOKEN_CONFIG.REFRESH_TOKEN.days;
}

export function getRefreshTokenExpirationDate(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + getRefreshTokenExpirationDays());
  return expiresAt;
}
