import { Router } from "express";
import { authMiddleware } from "../../../../presentation/middlewares/auth.middleware";
import validateUserId from "../../../../shared/utils/validateUserId";
import type { AnimalController } from "./AnimalController";

export const createAnimalRouter = (controller: AnimalController): Router => {
  const router = Router();
  router.use(authMiddleware);
  router.post("/", async (req, res) => {
    const result = await controller.createAnimal(validateUserId(req), req.body);
    res.status(result.statusCode).json(result.body);
  });
  router.get("/", async (req, res) => {
    const result = await controller.listAnimals(validateUserId(req), req.query);
    res.status(result.statusCode).json(result.body);
  });
  router.get("/:id/children", async (req, res) => {
    const result = await controller.listChildren(
      validateUserId(req),
      req.params.id,
      req.query,
    );
    res.status(result.statusCode).json(result.body);
  });
  router.get("/:id", async (req, res) => {
    const result = await controller.getAnimal(
      validateUserId(req),
      req.params.id,
    );
    res.status(result.statusCode).json(result.body);
  });
  router.put("/:id", async (req, res) => {
    const result = await controller.updateAnimal(
      validateUserId(req),
      req.params.id,
      req.body,
    );
    res.status(result.statusCode).json(result.body);
  });
  router.delete("/:id", async (req, res) => {
    const result = await controller.deleteAnimal(
      validateUserId(req),
      req.params.id,
    );
    res.status(result.statusCode).send();
  });
  return router;
};
