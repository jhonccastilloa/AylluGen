import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export const asyncHandler = (
  fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>,
) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
