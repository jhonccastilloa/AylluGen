import rateLimit from "express-rate-limit";
import { config } from "../../shared/constants/config";

export const generalLimiter = rateLimit({
  skip: () => !config.isProd,
  windowMs: 15 * 60 * 1000,
  limit: 100,
  message: {
    error: "Demasiadas solicitudes desde esta IP, intente nuevamente más tarde",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  skip: () => !config.isProd,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: {
    error: "Demasiados intentos de autenticación, intente nuevamente más tarde",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
