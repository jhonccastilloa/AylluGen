import jwt from "jsonwebtoken";
import { TOKEN_CONFIG } from "../constants/tokens";

export interface TokenPayload {
  userId: string;
  dni: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, TOKEN_CONFIG.ACCESS_TOKEN.secret, {
    expiresIn: TOKEN_CONFIG.ACCESS_TOKEN.expiresIn,
  } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, TOKEN_CONFIG.REFRESH_TOKEN.secret, {
    expiresIn: TOKEN_CONFIG.REFRESH_TOKEN.expiresIn,
  } as jwt.SignOptions);
};

export const verifyToken = (
  token: string,
  isRefreshToken = false,
): TokenPayload => {
  const secret = isRefreshToken
    ? TOKEN_CONFIG.REFRESH_TOKEN.secret
    : TOKEN_CONFIG.ACCESS_TOKEN.secret;
  return jwt.verify(token, secret) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return verifyToken(token, true);
};
