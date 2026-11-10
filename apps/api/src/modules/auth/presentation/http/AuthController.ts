import type {
  ChangePasswordUseCase,
  LoginUseCase,
  LogoutUseCase,
  RefreshTokenUseCase,
  RegisterUseCase,
} from "@ayllugen/core/auth/application/use-cases/index";
import {
  created,
  ok,
  noContent,
} from "../../../../presentation/http/HttpResult";
import type { HttpResult } from "../../../../presentation/http/HttpResult";
import type { IAuthResponseDto } from "./authDto";
import { AuthDtoMapper } from "./AuthDtoMapper";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from "./authSchema";

interface IAuthUseCases {
  registerUseCase: RegisterUseCase;
  loginUseCase: LoginUseCase;
  refreshTokenUseCase: RefreshTokenUseCase;
  logoutUseCase: LogoutUseCase;
  changePasswordUseCase: ChangePasswordUseCase;
}
export class AuthController {
  constructor(private readonly useCases: IAuthUseCases) {}
  async register(body: unknown): Promise<HttpResult<IAuthResponseDto>> {
    const input = registerSchema.parse(body);
    const result = await this.useCases.registerUseCase.execute(input);
    return created(AuthDtoMapper.toResponse(result));
  }
  async login(body: unknown): Promise<HttpResult<IAuthResponseDto>> {
    const input = loginSchema.parse(body);
    const result = await this.useCases.loginUseCase.execute(input);
    return ok(AuthDtoMapper.toResponse(result));
  }
  async refresh(body: unknown): Promise<HttpResult<IAuthResponseDto>> {
    const input = refreshTokenSchema.parse(body);
    const result = await this.useCases.refreshTokenUseCase.execute(
      input.refreshToken,
    );
    return ok(AuthDtoMapper.toResponse(result));
  }
  async logout(body: unknown): Promise<HttpResult<null>> {
    const input = refreshTokenSchema.parse(body);
    await this.useCases.logoutUseCase.execute(input.refreshToken);
    return noContent();
  }
  async changePassword(
    userId: string,
    body: unknown,
  ): Promise<HttpResult<null>> {
    const input = changePasswordSchema.parse(body);
    await this.useCases.changePasswordUseCase.execute(userId, input);
    return noContent();
  }
}
