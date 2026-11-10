import type {
  ITokenService,
  ITokenIdentity,
  IIssuedTokens,
} from "@ayllugen/core/auth/domain/ports/TokenService";
import { AuthError } from "@ayllugen/core/auth/domain/errors/AuthError";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { z } from "zod";

export interface IJwtTokenConfig {
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
}

const signedPayloadSchema = z.object({
  userId: z.string().min(1),
  dni: z.string().min(1),
  tokenUse: z.enum(["access", "refresh"]),
});

export class JwtTokenService implements ITokenService {
  constructor(private readonly settings: IJwtTokenConfig) {}

  issue(identity: ITokenIdentity): IIssuedTokens {
    const refreshToken = this.sign(identity, "refresh");
    return {
      accessToken: this.sign(identity, "access"),
      refreshToken,
      refreshExpiresAt: this.getRefreshExpiration(refreshToken),
    };
  }

  verifyAccess(token: string): ITokenIdentity {
    return this.verify(token, "access");
  }

  verifyRefresh(token: string): ITokenIdentity {
    try {
      return this.verify(token, "refresh");
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError)
        throw new AuthError(
          "INVALID_REFRESH_TOKEN",
          "Token de renovación inválido o expirado.",
        );
      throw error;
    }
  }

  private sign(
    identity: ITokenIdentity,
    tokenUse: "access" | "refresh",
  ): string {
    const refresh = tokenUse === "refresh";
    return jwt.sign(
      { userId: identity.userId, dni: identity.dni, tokenUse },
      refresh ? this.settings.jwtRefreshSecret : this.settings.jwtSecret,
      {
        expiresIn: (refresh
          ? this.settings.refreshTokenExpiresIn
          : this.settings.jwtExpiresIn) as jwt.SignOptions["expiresIn"],
        ...(refresh ? { jwtid: randomUUID() } : {}),
      },
    );
  }

  private verify(
    token: string,
    tokenUse: "access" | "refresh",
  ): ITokenIdentity {
    const secret =
      tokenUse === "refresh"
        ? this.settings.jwtRefreshSecret
        : this.settings.jwtSecret;
    const decoded = jwt.verify(token, secret);
    const result = signedPayloadSchema.safeParse(decoded);
    if (!result.success || result.data.tokenUse !== tokenUse) {
      throw new jwt.JsonWebTokenError("Invalid token payload");
    }
    return { userId: result.data.userId, dni: result.data.dni };
  }

  // Only read expiration from the refresh token just issued by this adapter.
  private getRefreshExpiration(token: string): Date {
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
}
