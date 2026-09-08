import { Router } from "express";
import { ProductionRecordController } from "../controllers/ProductionRecordController";
import { authMiddleware } from "../../../../presentation/middlewares/auth.middleware";
import { container, TYPES } from "../../../../shared/di/container";

const router = Router();
const productionRecordController = container.get<ProductionRecordController>(
  TYPES.ProductionRecordController,
);

router.use(authMiddleware);

router.post("/", productionRecordController.create);
router.get("/", productionRecordController.getAll);
router.get("/:productionRecordId", productionRecordController.getById);
router.get(
  "/animal/:animalId/summary/:type",
  productionRecordController.getSummary,
);
router.get("/animal/:animalId/recent", productionRecordController.getRecent);
router.put("/:productionRecordId", productionRecordController.update);
router.delete("/:productionRecordId", productionRecordController.delete);

export default router;
