import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../constants/config";

const tokenPayloadSchema = z.object({
  userId: z.string().min(1),
  dni: z.string().min(1),
});

export type TokenPayload = z.infer<typeof tokenPayloadSchema>;

const signedPayloadSchema = tokenPayloadSchema.extend({
  tokenUse: z.enum(["access", "refresh"]),
});

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign({ ...payload, tokenUse: "access" }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(
    { ...payload, tokenUse: "refresh" },
    config.jwtRefreshSecret,
    {
      expiresIn: config.refreshTokenExpiresIn,
    } as jwt.SignOptions,
  );
};

export const verifyToken = (
  token: string,
  isRefreshToken = false,
): TokenPayload => {
  const secret = isRefreshToken ? config.jwtRefreshSecret : config.jwtSecret;
  const decoded = jwt.verify(token, secret);
  const result = signedPayloadSchema.safeParse(decoded);
  if (
    !result.success ||
    result.data.tokenUse !== (isRefreshToken ? "refresh" : "access")
  ) {
    throw new jwt.JsonWebTokenError("Invalid token payload");
  }
  return { userId: result.data.userId, dni: result.data.dni };
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return verifyToken(token, true);
};

export function getRefreshTokenExpirationDate(token: string): Date {
  const payload = jwt.decode(token);
  if (
    !payload ||
    typeof payload === "string" ||
    typeof payload.exp !== "number" ||
    !Number.isFinite(payload.exp)
  ) {
    throw new jwt.JsonWebTokenError("Invalid refresh token expiration");
  }
  const expiresAt = new Date(payload.exp * 1000);
  if (Number.isNaN(expiresAt.getTime())) {
    throw new jwt.JsonWebTokenError("Invalid refresh token expiration");
  }
  return expiresAt;
}
