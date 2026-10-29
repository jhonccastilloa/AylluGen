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

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new UnauthenticatedError("Token no proporcionado");
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};
