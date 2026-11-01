import { config } from "./config";

export const TOKEN_CONFIG = {
  ACCESS_TOKEN: {
    expiresIn: config.jwtExpiresIn,
    secret: config.jwtSecret,
  },
  REFRESH_TOKEN: {
    expiresIn: config.refreshTokenExpiresIn,
    secret: config.jwtRefreshSecret,
  },
} as const;
