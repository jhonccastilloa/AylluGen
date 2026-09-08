import { injectable, inject } from "inversify";
import { UserService } from "../../application/services/UserService";
import { asyncHandler } from "@presentation/middlewares";
import { TYPES } from "../../../../shared/di/types";
import validateUserId from "@shared/utils/validateUserId";
import { AuthorizationError } from "../../../../shared/errors/AppError";
import {
  updateUserSchema,
  userIdParamSchema,
} from "../../application/schemas/user.schema";

@injectable()
export class UserController {
  constructor(@inject(TYPES.UserService) private userService: UserService) {}

  getMe = asyncHandler(async (req, res) => {
    const userId = validateUserId(req);
    const result = await this.userService.getProfile(userId);
    res.status(200).json(result);
  });

  getById = asyncHandler(async (req, res) => {
    const { userId } = userIdParamSchema.parse(req.params);
    if (userId !== validateUserId(req)) throw new AuthorizationError();
    const result = await this.userService.getById(userId);
    res.status(200).json(result);
  });
  update = asyncHandler(async (req, res) => {
    const { userId } = userIdParamSchema.parse(req.params);
    if (userId !== validateUserId(req)) throw new AuthorizationError();
    const data = updateUserSchema.parse(req.body);
    const result = await this.userService.updateUser(userId, data);
    res.status(200).json(result);
  });

  delete = asyncHandler(async (req, res) => {
    const { userId } = userIdParamSchema.parse(req.params);
    if (userId !== validateUserId(req)) throw new AuthorizationError();
    await this.userService.deleteUser(userId);
    res.status(204).send();
  });
}
