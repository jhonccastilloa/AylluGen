import { Router } from "express";
import { authMiddleware } from "../../../../presentation/middlewares/auth.middleware";
import validateUserId from "../../../../shared/utils/validateUserId";
import { SpecieController } from "./SpecieController";

export const createSpecieRouter = (controller: SpecieController): Router => {
  const router = Router();

  router.use(authMiddleware);

  router.post("/", async (req, res) => {
    const result = await controller.createSpecie(validateUserId(req), req.body);
    res.status(result.statusCode).json(result.body);
  });

  router.get("/", async (req, res) => {
    const result = await controller.listSpecies(validateUserId(req));
    res.status(result.statusCode).json(result.body);
  });

  router.get("/:id", async (req, res) => {
    const result = await controller.getSpecie(
      validateUserId(req),
      req.params.id,
    );
    res.status(result.statusCode).json(result.body);
  });

  router.put("/:id", async (req, res) => {
    const result = await controller.updateSpecie(
      validateUserId(req),
      req.params.id,
      req.body,
    );
    res.status(result.statusCode).json(result.body);
  });

  router.delete("/:id", async (req, res) => {
    const result = await controller.deleteSpecie(
      validateUserId(req),
      req.params.id,
    );
    res.status(result.statusCode).send();
  });

  return router;
};
