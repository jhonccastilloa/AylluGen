import { inject, injectable } from "inversify";
import { WatermelonService } from "../../application/services/WatermelonService";
import {
  watermelonPullSchema,
  watermelonPushSchema,
} from "../../application/schemas/watermelon.schema";
import { asyncHandler } from "../../../../presentation/middlewares/asyncHandler.middleware";
import validateUserId from "../../../../shared/utils/validateUserId";

@injectable()
export class WatermelonController {
  constructor(@inject(WatermelonService) private service: WatermelonService) {}
  pull = asyncHandler(async (req, res) => {
    const input = watermelonPullSchema.parse(req.body);
    res.json(await this.service.pull(validateUserId(req), input));
  });
  push = asyncHandler(async (req, res) => {
    const input = watermelonPushSchema.parse(req.body);
    await this.service.push(validateUserId(req), input);
    res.status(204).send();
  });
}
