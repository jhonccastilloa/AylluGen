import { Router } from "express";
import authRoutes from "../../modules/auth/presentation/routes/auth.routes";
import userRoutes from "../../modules/user/presentation/routes/user.routes";
import animalRoutes from "../../modules/animal/presentation/routes/animal.routes";
import breedingRoutes from "../../modules/breeding/presentation/routes/breeding.routes";
import healthRoutes from "../../modules/health/presentation/routes/health.routes";
import productionRoutes from "../../modules/production/presentation/routes/production.routes";
import syncRoutes from "../../modules/sync/presentation/routes/sync.routes";
import speciesRoutes from "../../modules/species/presentation/routes/species.routes";
import {
  healthCheck,
  readyCheck,
  liveCheck,
} from "../../infrastructure/health/health.controller";

const router = Router();

router.get("/health", healthCheck);
router.get("/ready", readyCheck);
router.get("/live", liveCheck);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/animals", animalRoutes);
router.use("/breedings", breedingRoutes);
router.use("/sanity", healthRoutes);
router.use("/production", productionRoutes);
router.use("/sync", syncRoutes);
router.use("/species", speciesRoutes);

export default router;
