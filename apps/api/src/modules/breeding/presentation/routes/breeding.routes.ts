import { Router } from "express";
import { BreedingController } from "../controllers/BreedingController";
import { authMiddleware } from "../../../../presentation/middlewares/auth.middleware";
import { container, TYPES } from "../../../../shared/di/container";

const router = Router();
const breedingController = container.get<BreedingController>(
  TYPES.BreedingController,
);

router.use(authMiddleware);

router.post("/calculate-coi", breedingController.calculateCOI);
router.post("/", breedingController.create);
router.get("/", breedingController.getAll);
router.get("/:breedingId", breedingController.getById);
router.put("/:breedingId", breedingController.update);
router.delete("/:breedingId", breedingController.delete);
router.get("/history/:animalId", breedingController.getHistory);

export default router;
