import { Router } from "express";
import { SyncController } from "../controllers/SyncController";
import { authMiddleware } from "../../../../presentation/middlewares/auth.middleware";
import { container, TYPES } from "../../../../shared/di/container";
import { WatermelonController } from "../controllers/WatermelonController";

const router = Router();
const syncController = container.get<SyncController>(TYPES.SyncController);

router.use(authMiddleware);
const watermelon = container.get(WatermelonController);
router.post("/v2/pull", watermelon.pull);
router.post("/v2/push", watermelon.push);

// Retained for clients using the old queue protocol.
router.use((_req, res, next) => {
  res.setHeader("Deprecation", "@1788566400");
  res.setHeader("Link", '</api/sync/v2/pull>; rel="successor-version"');
  next();
});

router.post(
  "/push",

  syncController.push,
);
router.post("/pull", syncController.pull);
router.post(
  "/resolve-conflict",

  syncController.resolveConflict,
);

export default router;
