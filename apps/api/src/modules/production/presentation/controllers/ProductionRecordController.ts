import { injectable, inject } from "inversify";
import { ProductionRecordService } from "../../application/services/ProductionRecordService";
import { Response } from "express";
import { AuthRequest } from "../../../../presentation/middlewares/auth.middleware";
import { TYPES } from "../../../../shared/di/types";
import { asyncHandler } from "@presentation/middlewares";
import {
  productionGetAllQuerySchema,
  productionReacordRecentQuerySchema,
  productionRecordCreateSchema,
  productionRecordIdParamSchema,
  productionRecordSummaryParamSchema,
  productionRecordUpdateSchema,
} from "../../application/schemas/production.schema";
import validateUserId from "@shared/utils/validateUserId";
import { animalIdParamSchema } from "src/modules/animal/application/schemas/animal.schema";

@injectable()
export class ProductionRecordController {
  constructor(
    @inject(TYPES.ProductionRecordService)
    private productionRecordService: ProductionRecordService,
  ) {}

  create = asyncHandler(async (req, res) => {
    const userId = validateUserId(req);
    const data = productionRecordCreateSchema.parse(req.body);
    const result = await this.productionRecordService.create(userId, data);
    res.status(201).json(result);
  });
  getAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = validateUserId(req);
    const { animalId, type } = productionGetAllQuerySchema.parse(req.query);
    const result = await this.productionRecordService.getAll(
      userId,
      animalId,
      type,
    );
    res.json(result);
  });
  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { productionRecordId } = productionRecordIdParamSchema.parse(
      req.params,
    );
    const userId = validateUserId(req);
    const result = await this.productionRecordService.getById(
      productionRecordId,
      userId,
    );
    res.json(result);
  });
  getSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { animalId, type } = productionRecordSummaryParamSchema.parse(
      req.params,
    );
    const userId = validateUserId(req);
    const result = await this.productionRecordService.getSummary(
      animalId,
      userId,
      type,
    );
    res.json(result);
  });
  getRecent = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { animalId } = animalIdParamSchema.parse(req.params);
    const { limit } = productionReacordRecentQuerySchema.parse(req.query);
    const userId = validateUserId(req);
    const result = await this.productionRecordService.getRecent(
      animalId as string,
      userId,
      limit,
    );
    res.json(result);
  });
  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { productionRecordId } = productionRecordIdParamSchema.parse(
      req.params,
    );
    const userId = validateUserId(req);
    const data = productionRecordUpdateSchema.parse(req.body);
    const result = await this.productionRecordService.update(
      productionRecordId,
      userId,
      data,
    );
    res.json(result);
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { productionRecordId } = productionRecordIdParamSchema.parse(
      req.params,
    );
    const userId = validateUserId(req);
    await this.productionRecordService.delete(productionRecordId, userId);
    res.status(204).send();
  });
}
