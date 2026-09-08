import { injectable, inject } from "inversify";
import { SyncService } from "../../application/services/SyncService";
import { Response } from "express";
import { AuthRequest } from "../../../../presentation/middlewares/auth.middleware";
import { TYPES } from "../../../../shared/di/types";
import {
  conflictResolutionSchema,
  syncPullSchema,
  syncPushSchema,
} from "../../application/schemas/sync.schema";
import { asyncHandler } from "@presentation/middlewares";
import validateUserId from "../../../../shared/utils/validateUserId";

@injectable()
export class SyncController {
  constructor(@inject(TYPES.SyncService) private syncService: SyncService) {}

  push = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = syncPushSchema.parse({
      ...req.body,
      userId: validateUserId(req),
    });
    const result = await this.syncService.pushChanges(data);
    res.json(result);
  });

  pull = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = syncPullSchema.parse({
      ...req.body,
      userId: validateUserId(req),
    });
    const result = await this.syncService.pullChanges(data);
    res.json(result);
  });

  resolveConflict = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { resolution, recordId, tableName } = conflictResolutionSchema.parse(
      req.body,
    );
    await this.syncService.resolveConflict(
      tableName,
      recordId,
      resolution,
      validateUserId(req),
    );
    res.status(204).send();
  });
}
