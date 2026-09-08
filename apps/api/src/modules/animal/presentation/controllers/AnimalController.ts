import { injectable, inject } from "inversify";
import { AnimalService } from "../../application/services/AnimalService";
import { TYPES } from "../../../../shared/di/types";
import {
  animalCreateSchema,
  animalIdParamSchema,
  animalQuerySchema,
} from "../../application/schemas/animal.schema";
import validateUserId from "@shared/utils/validateUserId";
import { asyncHandler } from "@presentation/middlewares";

@injectable()
export class AnimalController {
  constructor(
    @inject(TYPES.AnimalService) private animalService: AnimalService,
  ) {}

  create = asyncHandler(async (req, res) => {
    const userId = validateUserId(req);
    const data = animalCreateSchema.parse(req.body);
    const result = await this.animalService.create(userId, data);
    res.status(201).json(result);
  });
  getAll = asyncHandler(async (req, res) => {
    const userId = validateUserId(req);
    const query = animalQuerySchema.parse(req.query);
    const result = await this.animalService.getAll(userId, query);
    res.json(result);
  });
  getFounders = asyncHandler(async (req, res) => {
    const userId = validateUserId(req);
    const result = await this.animalService.getFounders(userId);
    res.json(result);
  });
  getMales = asyncHandler(async (req, res) => {
    const userId = validateUserId(req);
    const result = await this.animalService.getMales(userId);
    res.json(result);
  });

  getFemales = asyncHandler(async (req, res) => {
    const userId = validateUserId(req);
    const result = await this.animalService.getFemales(userId);
    res.json(result);
  });
  getById = asyncHandler(async (req, res) => {
    const { animalId } = animalIdParamSchema.parse(req.params);
    const userId = validateUserId(req);
    const result = await this.animalService.getAnimal(animalId, userId);
    res.json(result);
  });
  getPedigree = asyncHandler(async (req, res) => {
    const { animalId } = animalIdParamSchema.parse(req.params);
    const userId = validateUserId(req);
    const result = await this.animalService.getPedigree(animalId, userId);
    res.json(result);
  });
  delete = asyncHandler(async (req, res) => {
    const { animalId } = animalIdParamSchema.parse(req.params);
    const userId = validateUserId(req);
    await this.animalService.delete(animalId, userId);
    res.status(204).send();
  });
  update = asyncHandler(async (req, res) => {
    const { animalId } = animalIdParamSchema.parse(req.params);
    const userId = validateUserId(req);
    const result = await this.animalService.update(animalId, userId, req.body);
    res.json(result);
  });
}
