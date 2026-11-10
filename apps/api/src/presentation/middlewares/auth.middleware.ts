import type { Request, RequestHandler } from "express";
import type { ITokenIdentity } from "@ayllugen/core/auth/domain/ports/TokenService";
import { UnauthenticatedError } from "../errors/UnauthenticatedError";
import { tokenService } from "../../modules/auth/infrastructure/security/tokenService";

export interface AuthRequest extends Request {
  user?: ITokenIdentity;
}

export const authMiddleware: RequestHandler = (
  req: AuthRequest,
  _res,
  next,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new UnauthenticatedError("Token no proporcionado");
  }

  // Bearer credentials use one or more spaces and a single token (RFC 6750).
  const credentials = /^Bearer +([A-Za-z0-9._~+\/-]+=*)$/i.exec(authHeader);
  if (!credentials) {
    throw new UnauthenticatedError(
      "Se requiere Authorization: Bearer <token>.",
    );
  }

  const token = credentials[1];
  req.user = tokenService.verifyAccess(token);
  next();
};
