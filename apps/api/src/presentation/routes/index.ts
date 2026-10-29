import { Router } from "express";
import { createSpecieRouter } from "../../modules/specie/SpecieRouter";
import type { IContainerControllers } from "../../composition/container";

export const createRoutes = (controllers: IContainerControllers): Router => {
  const router = Router();

  // router.get("/health", healthCheck);
  // router.get("/ready", readyCheck);
  // router.get("/live", liveCheck);
  // router.use("/auth", authRoutes);
  // router.use("/users", userRoutes);
  // router.use("/animals", animalRoutes);
  // router.use("/breedings", breedingRoutes);
  // router.use("/sanity", healthRoutes);
  // router.use("/production", productionRoutes);
  // router.use("/sync", syncRoutes);

  router.use("/species", createSpecieRouter(controllers.specie));

  return router;
};
