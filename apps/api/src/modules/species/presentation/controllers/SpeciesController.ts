import { injectable, inject } from "inversify";
import { TYPES } from "../../../../shared/di/types";
import { SpeciesService } from "../../application/services/SpeciesService";
import validateUserId from "@shared/utils/validateUserId";
import { asyncHandler } from "@presentation/middlewares";
import {
  speciesCreateSchema,
  speciesIdParamSchema,
  speciesUpdateSchema,
} from "../../application/schemas/species.schema";

@injectable()
export class SpeciesController {
  constructor(
    @inject(TYPES.SpeciesService)
    private speciesService: SpeciesService,
  ) {}

  create = asyncHandler(async (req, res) => {
    const userId = validateUserId(req);
    const payload = speciesCreateSchema.parse(req.body);
    const result = await this.speciesService.create(userId, payload);
    res.status(201).json(result);
  });

  getAll = asyncHandler(async (req, res) => {
    const userId = validateUserId(req);
    const result = await this.speciesService.getAll(userId);
    res.status(200).json({ species: result });
  });

  getById = asyncHandler(async (req, res) => {
    const userId = validateUserId(req);
    const { speciesId } = speciesIdParamSchema.parse(req.params);
    const result = await this.speciesService.getById(speciesId, userId);
    res.status(200).json(result);
  });

  update = asyncHandler(async (req, res) => {
    const userId = validateUserId(req);
    const { speciesId } = speciesIdParamSchema.parse(req.params);
    const payload = speciesUpdateSchema.parse(req.body);
    const result = await this.speciesService.update(speciesId, userId, payload);
    res.status(200).json(result);
  });

  delete = asyncHandler(async (req, res) => {
    const userId = validateUserId(req);
    const { speciesId } = speciesIdParamSchema.parse(req.params);
    await this.speciesService.delete(speciesId, userId);
    res.status(204).send();
  });
}

