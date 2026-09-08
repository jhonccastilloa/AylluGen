import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { authMiddleware } from "../../../../presentation/middlewares/auth.middleware";
import { container, TYPES } from "../../../../shared/di/container";

const router = Router();
const userController = container.get<UserController>(TYPES.UserController);

router.use(authMiddleware);
router.get("/me", userController.getMe);
router.get("/:userId", userController.getById);
router.put("/:userId", userController.update);
router.delete("/:userId", userController.delete);

export default router;
