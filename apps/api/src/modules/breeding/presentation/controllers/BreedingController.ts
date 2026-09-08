import { injectable, inject } from "inversify";
import { BreedingService } from "../../application/services/BreedingService";
import { TYPES } from "../../../../shared/di/types";
import {
  breedingCreateSchema,
  breedingIdParamSchema,
  breedingMatchSchema,
  breedingUpdateSchema,
} from "../../application/schemas/breeding.schema";
import validateUserId from "@shared/utils/validateUserId";
import { asyncHandler } from "@presentation/middlewares";
import { animalIdParamSchema } from "src/modules/animal/application/schemas/animal.schema";

@injectable()
export class BreedingController {
  constructor(
    @inject(TYPES.BreedingService) private breedingService: BreedingService,
  ) {}

  calculateCOI = asyncHandler(async (req, res) => {
    const userId = validateUserId(req);
    const data = breedingMatchSchema.parse(req.body);
    const result = await this.breedingService.calculateCOI(userId, data);
    res.json(result);
  });

  create = asyncHandler(async (req, res) => {
    const userId = validateUserId(req);
    const data = breedingCreateSchema.parse(req.body);
    const result = await this.breedingService.create(userId, data);
    res.status(201).json(result);
  });
  getAll = asyncHandler(async (req, res) => {
    const userId = validateUserId(req);
    const result = await this.breedingService.getAll(userId);
    res.json(result);
  });
  getById = asyncHandler(async (req, res) => {
    const { breedingId } = breedingIdParamSchema.parse(req.params);
    const userId = validateUserId(req);
    const result = await this.breedingService.getById(breedingId, userId);
    res.json(result);
  });

  update = asyncHandler(async (req, res) => {
    const userId = validateUserId(req);
    const { breedingId } = breedingIdParamSchema.parse(req.params);
    const data = breedingUpdateSchema.parse(req.body);
    const result = await this.breedingService.updateBreeding(
      breedingId,
      userId,
      data,
    );
    res.json(result);
  });

  delete = asyncHandler(async (req, res) => {
    const { breedingId } = breedingIdParamSchema.parse(req.params);
    const userId = validateUserId(req);
    await this.breedingService.deleteBreeding(breedingId, userId);
    res.status(204).send();
  });

  getHistory = asyncHandler(async (req, res) => {
    const { animalId } = animalIdParamSchema.parse(req.params);
    const userId = validateUserId(req);
    const result = await this.breedingService.getBreedingHistory(
      animalId,
      userId,
    );
    res.json(result);
  });
}
