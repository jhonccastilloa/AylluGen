import type { IUserRepository } from "../../../user/domain/ports/UserRepository";
import type { IAuthRepository } from "../../domain/ports/AuthRepository";
import type { IPasswordHasher } from "../../domain/ports/PasswordHasher";
import type { ITokenService } from "../../domain/ports/TokenService";
import { AuthError } from "../../domain/errors/AuthError";
import { RefreshTokenEntity } from "../../domain/entities/RefreshTokenEntity";
import type { IAuthResult } from "../results/AuthResult";

export interface ILoginInput {
  dni: string;
  password: string;
}

export class LoginUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly auth: IAuthRepository,
    private readonly passwords: IPasswordHasher,
    private readonly tokens: ITokenService,
  ) {}
  async execute(input: ILoginInput): Promise<IAuthResult> {
    const user = await this.users.findByDni(input.dni);
    if (
      !user ||
      !(await this.passwords.verify(input.password, user.passwordHash))
    )
      throw new AuthError("INVALID_CREDENTIALS", "Credenciales inválidas.");
    const issued = this.tokens.issue({ userId: user.id, dni: user.dni });
    const session = RefreshTokenEntity.create({
      userId: user.id,
      token: issued.refreshToken,
      expiresAt: issued.refreshExpiresAt,
    });
    if (!(await this.auth.openSession(user, session))) {
      throw new AuthError("INVALID_CREDENTIALS", "Credenciales inválidas.");
    }
    return {
      accessToken: issued.accessToken,
      refreshToken: issued.refreshToken,
      user,
    };
  }
}
