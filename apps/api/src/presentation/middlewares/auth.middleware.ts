import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../../shared/utils/jwt";
import { UnauthenticatedError } from "../errors/UnauthenticatedError";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    dni: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new UnauthenticatedError("Token no proporcionado");
    }

    // Bearer credentials use one or more spaces and a single token (RFC 6750).
    const credentials = /^Bearer +([A-Za-z0-9._~+\/-]+=*)$/i.exec(authHeader);
    if (!credentials) {
      throw new UnauthenticatedError("Se requiere Authorization: Bearer <token>.");
    }

    const token = credentials[1];
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};
