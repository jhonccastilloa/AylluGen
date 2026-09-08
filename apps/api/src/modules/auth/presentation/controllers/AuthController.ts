import { injectable, inject } from "inversify";
import { AuthService } from "../../application/services/AuthService";
import { TYPES } from "../../../../shared/di/types";
import { asyncHandler } from "@presentation/middlewares";
import {
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
} from "../../application/schemas/auth.schema";

@injectable()
export class AuthController {
  constructor(@inject(TYPES.AuthService) private authService: AuthService) {}

  register = asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const result = await this.authService.register(data);
    res.status(201).json(result);
  });

  login = asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const result = await this.authService.login(data);
    res.status(200).json(result);
  });

  refreshToken = asyncHandler(async (req, res) => {
    const data = refreshTokenSchema.parse(req.body);
    const result = await this.authService.refreshToken(data);
    res.status(200).json(result);
  });

  logout = asyncHandler(async (req, res) => {
    const data = logoutSchema.parse(req.body);
    await this.authService.logout(data);
    res.status(200).json({ message: "Sesión cerrada exitosamente" });
  });
}
