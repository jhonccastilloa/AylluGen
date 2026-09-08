import { Request, Response, NextFunction } from "express";
import { ZodTypeAny, ZodError } from "zod";
import { ZodValidationError } from "../../shared/errors/AppError";

export const validate = (schema: ZodTypeAny) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      console.log("asd")
      if (error instanceof ZodError) {
        const errors = error.issues.map((issue) => ({
          path: issue.path.map(String),
          message: issue.message,
          code: issue.code,
          input: issue.input,
        }));
        throw new ZodValidationError(errors);
      }
      next(error);
    }
  };
};
