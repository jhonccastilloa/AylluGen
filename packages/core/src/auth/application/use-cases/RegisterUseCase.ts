import { UserEntity } from "../../../user/domain/entities/UserEntity";
import { UserError } from "../../../user/domain/errors/UserError";
import type { IUserRepository } from "../../../user/domain/ports/UserRepository";
import type { IIdGeneratorPort } from "../../../shared/ports/IdGeneratorPort";
import type { IAuthRepository } from "../../domain/ports/AuthRepository";
import type { IPasswordHasher } from "../../domain/ports/PasswordHasher";
import type { ITokenService } from "../../domain/ports/TokenService";
import { PlainPassword } from "../../domain/value-objects/PlainPassword";
import { RefreshTokenEntity } from "../../domain/entities/RefreshTokenEntity";
import type { IAuthResult } from "../results/AuthResult";

export interface IRegisterInput {
  dni: string;
  password: string;
}

export class RegisterUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly auth: IAuthRepository,
    private readonly passwords: IPasswordHasher,
    private readonly tokens: ITokenService,
    private readonly idGenerator: IIdGeneratorPort,
  ) {}

  async execute(input: IRegisterInput): Promise<IAuthResult> {
    const password = PlainPassword.create(input.password);
    if (await this.users.findByDni(input.dni))
      throw new UserError("USER_DUPLICATE", "El DNI ya está registrado.");
    const now = new Date();
    const user = UserEntity.create({
      id: this.idGenerator.generate(),
      dni: input.dni,
      passwordHash: await this.passwords.hash(password),
      createdAt: now,
      updatedAt: now,
    });
    const issued = this.tokens.issue({ userId: user.id, dni: user.dni });
    const session = RefreshTokenEntity.create({
      userId: user.id,
      token: issued.refreshToken,
      expiresAt: issued.refreshExpiresAt,
    });
    const saved = await this.auth.register(user, session);
    return {
      accessToken: issued.accessToken,
      refreshToken: issued.refreshToken,
      user: saved,
    };
  }
}
