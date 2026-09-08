import { injectable, inject } from "inversify";
import { HealthRecordService } from "../../application/services/HealthRecordService";
import { Response } from "express";
import { AuthRequest } from "../../../../presentation/middlewares/auth.middleware";
import { TYPES } from "../../../../shared/di/types";
import validateUserId from "@shared/utils/validateUserId";
import {
  healthRecordCreateSchema,
  healthRecordIdSchema,
  healthRecordQuerySchema,
  healthRecordUpcomingQuerySchema,
  healthRecordUpdateSchema,
} from "../../application/schemas/health.schema";

@injectable()
export class HealthRecordController {
  constructor(
    @inject(TYPES.HealthRecordService)
    private healthRecordService: HealthRecordService,
  ) {}

  create = async (req: AuthRequest, res: Response) => {
    const userId = validateUserId(req);
    const data = healthRecordCreateSchema.parse(req.body);
    const result = await this.healthRecordService.create(userId, data);
    res.status(201).json(result);
  };

  update = async (req: AuthRequest, res: Response) => {
    const { healthRecordId } = healthRecordIdSchema.parse(req.params);
    const userId = validateUserId(req);
    const data = healthRecordUpdateSchema.parse(req.body);
    const result = await this.healthRecordService.update(
      healthRecordId,
      userId,
      data,
    );
    res.json(result);
  };

  delete = async (req: AuthRequest, res: Response) => {
    const { healthRecordId } = healthRecordIdSchema.parse(req.params);
    const userId = validateUserId(req);
    await this.healthRecordService.delete(healthRecordId, userId);
    res.status(204).send();
  };

  getById = async (req: AuthRequest, res: Response) => {
    const { healthRecordId } = healthRecordIdSchema.parse(req.params);
    const userId = validateUserId(req);
    const result = await this.healthRecordService.getById(
      healthRecordId,
      userId,
    );
    res.json(result);
  };

  getAll = async (req: AuthRequest, res: Response) => {
    const userId = validateUserId(req);
    const { animalId, type, completed } = healthRecordQuerySchema.parse(
      req.query,
    );
    const result = await this.healthRecordService.getAll(
      userId,
      animalId,
      type,
      completed,
    );
    res.json(result);
  };

  getUpcoming = async (req: AuthRequest, res: Response) => {
    const { daysAhead } = healthRecordUpcomingQuerySchema.parse(req.query);
    const userId = validateUserId(req);
    const result = await this.healthRecordService.getUpcomingTasks(
      userId,
      daysAhead,
    );
    res.json(result);
  };
}
