import { Router } from "express";
import { authMiddleware } from "../../../../presentation/middlewares/auth.middleware";
import validateUserId from "../../../../shared/utils/validateUserId";
import type { UserController } from "./UserController";

export const createUserRouter = (controller: UserController): Router => {
  const router = Router();
  router.use(authMiddleware);
  router.get("/me", async (req, res) => {
    const result = await controller.me(validateUserId(req));
    res.status(result.statusCode).json(result.body);
  });
  return router;
};
