import { Router } from "express";
import { asyncHandler, authMiddleware } from "../../../../presentation/middlewares";
import validateUserId from "../../../../shared/utils/validateUserId";
import { SpecieController } from "./SpecieController";

export const createSpecieRouter = (controller: SpecieController): Router => {
  const router = Router();

  router.use(authMiddleware);

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const result = await controller.createSpecie(
        validateUserId(req),
        req.body,
      );
      res.status(result.statusCode).json(result.body);
    }),
  );

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const result = await controller.listSpecies(validateUserId(req));
      res.status(result.statusCode).json(result.body);
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const result = await controller.getSpecie(
        validateUserId(req),
        req.params.id,
      );
      res.status(result.statusCode).json(result.body);
    }),
  );

  router.put(
    "/:id",
    asyncHandler(async (req, res) => {
      const result = await controller.updateSpecie(
        validateUserId(req),
        req.params.id,
        req.body,
      );
      res.status(result.statusCode).json(result.body);
    }),
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const result = await controller.deleteSpecie(
        validateUserId(req),
        req.params.id,
      );
      res.status(result.statusCode).send();
    }),
  );

  return router;
};
