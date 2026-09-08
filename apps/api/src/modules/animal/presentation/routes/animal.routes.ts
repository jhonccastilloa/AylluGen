import { Router } from "express";
import { AnimalController } from "../controllers/AnimalController";
import { authMiddleware } from "../../../../presentation/middlewares/auth.middleware";
import { validate } from "../../../../presentation/middlewares/validation.middleware";
import { animalUpdateSchema } from "../../application/schemas/animal.schema";
import { container, TYPES } from "../../../../shared/di/container";

const router = Router();
const animalController = container.get<AnimalController>(
  TYPES.AnimalController,
);

router.use(authMiddleware);

router.post("/", animalController.create);
router.get("/", animalController.getAll);
router.get("/founders", animalController.getFounders);
router.get("/males", animalController.getMales);
router.get("/females", animalController.getFemales);
router.get("/:animalId", animalController.getById);
router.get("/:animalId/pedigree", animalController.getPedigree);
router.put("/:animalId", validate(animalUpdateSchema), animalController.update);
router.delete("/:animalId", animalController.delete);

export default router;
