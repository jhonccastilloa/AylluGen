import { Router } from "express";
import { authMiddleware } from "../../../../presentation/middlewares/auth.middleware";
import { container, TYPES } from "../../../../shared/di/container";
import { SpeciesController } from "../controllers/SpeciesController";

const router = Router();
const speciesController = container.get<SpeciesController>(TYPES.SpeciesController);

router.use(authMiddleware);

router.post("/", speciesController.create);
router.get("/", speciesController.getAll);
router.get("/:speciesId", speciesController.getById);
router.put("/:speciesId", speciesController.update);
router.delete("/:speciesId", speciesController.delete);

export default router;

