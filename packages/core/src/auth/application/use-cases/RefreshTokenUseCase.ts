import type { IUserRepository } from "../../../user/domain/ports/UserRepository";
import type { IAuthRepository } from "../../domain/ports/AuthRepository";
import type { ITokenService } from "../../domain/ports/TokenService";
import { AuthError } from "../../domain/errors/AuthError";
import { RefreshTokenEntity } from "../../domain/entities/RefreshTokenEntity";
import type { IAuthResult } from "../results/AuthResult";

export class RefreshTokenUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly auth: IAuthRepository,
    private readonly tokens: ITokenService,
  ) {}
  async execute(token: string): Promise<IAuthResult> {
    const identity = this.tokens.verifyRefresh(token);
    const user = await this.users.findById(identity.userId);
    if (!user)
      throw new AuthError(
        "INVALID_REFRESH_TOKEN",
        "Token de renovación inválido o expirado.",
      );
    const issued = this.tokens.issue({ userId: user.id, dni: user.dni });
    const session = RefreshTokenEntity.create({
      userId: user.id,
      token: issued.refreshToken,
      expiresAt: issued.refreshExpiresAt,
    });
    if (!(await this.auth.rotateSession(user, token, session))) {
      throw new AuthError(
        "INVALID_REFRESH_TOKEN",
        "Token de renovación inválido o expirado.",
      );
    }
    return {
      accessToken: issued.accessToken,
      refreshToken: issued.refreshToken,
      user,
    };
  }
}
