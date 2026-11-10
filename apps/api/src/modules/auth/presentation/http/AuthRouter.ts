import { Router } from "express";
import { authMiddleware } from "../../../../presentation/middlewares/auth.middleware";
import { authLimiter } from "../../../../presentation/middlewares/rate-limit.middleware";
import validateUserId from "../../../../shared/utils/validateUserId";
import type { AuthController } from "./AuthController";

export const createAuthRouter = (controller: AuthController): Router => {
  const router = Router();
  router.post("/register", authLimiter, async (req, res) => {
    const result = await controller.register(req.body);
    res.status(result.statusCode).json(result.body);
  });
  router.post("/login", authLimiter, async (req, res) => {
    const result = await controller.login(req.body);
    res.status(result.statusCode).json(result.body);
  });
  router.post("/refresh", async (req, res) => {
    const result = await controller.refresh(req.body);
    res.status(result.statusCode).json(result.body);
  });
  router.post("/logout", async (req, res) => {
    const result = await controller.logout(req.body);
    res.status(result.statusCode).send();
  });
  router.post(
    "/change-password",
    authLimiter,
    authMiddleware,
    async (req, res) => {
      const result = await controller.changePassword(
        validateUserId(req),
        req.body,
      );
      res.status(result.statusCode).send();
    },
  );
  return router;
};
