import { Router } from "express";
import { createSpecieRouter } from "../../modules/specie/presentation/http/SpecieRouter";
import type { IContainerControllers } from "../../composition/container";
import { createAuthRouter } from "../../modules/auth/presentation/http/AuthRouter";
import { createUserRouter } from "../../modules/user/presentation/http/UserRouter";

export const createRoutes = (controllers: IContainerControllers): Router => {
  const router = Router();

  // router.get("/health", healthCheck);
  // router.get("/ready", readyCheck);
  // router.get("/live", liveCheck);
  router.use("/auth", createAuthRouter(controllers.auth));
  router.use("/users", createUserRouter(controllers.user));
  // router.use("/animals", animalRoutes);
  // router.use("/breedings", breedingRoutes);
  // router.use("/sanity", healthRoutes);
  // router.use("/production", productionRoutes);
  // router.use("/sync", syncRoutes);

  router.use("/species", createSpecieRouter(controllers.specie));

  return router;
};
