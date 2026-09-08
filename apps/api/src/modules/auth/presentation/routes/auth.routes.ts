import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { authLimiter } from "../../../../presentation/middlewares/rate-limit.middleware";
import { container, TYPES } from "../../../../shared/di/container";

const router = Router();
const authController = container.get<AuthController>(TYPES.AuthController);

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.post("/refresh", authController.refreshToken);
router.post("/logout", authLimiter, authController.logout);

export default router;
