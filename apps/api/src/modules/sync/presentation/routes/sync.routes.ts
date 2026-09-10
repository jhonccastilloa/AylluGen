import { Router } from "express";
import { authMiddleware } from "../../../../presentation/middlewares/auth.middleware";
import { container } from "../../../../shared/di/container";
import { WatermelonController } from "../controllers/WatermelonController";

const router = Router();

router.use(authMiddleware);
const watermelon = container.get(WatermelonController);
router.post("/v2/pull", watermelon.pull);
router.post("/v2/push", watermelon.push);

export default router;
