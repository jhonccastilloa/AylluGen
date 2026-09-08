import { Router } from "express";
import { HealthRecordController } from "../controllers/HealthRecordController";
import { authMiddleware } from "../../../../presentation/middlewares/auth.middleware";
import { container, TYPES } from "../../../../shared/di/container";

const router = Router();
const healthRecordController = container.get<HealthRecordController>(
  TYPES.HealthRecordController,
);

router.use(authMiddleware);

router.post("/", healthRecordController.create);
router.get("/", healthRecordController.getAll);
router.get("/upcoming", healthRecordController.getUpcoming);
router.get("/:healthRecordId", healthRecordController.getById);
router.put("/:healthRecordId", healthRecordController.update);
router.delete("/:healthRecordId", healthRecordController.delete);

export default router;
