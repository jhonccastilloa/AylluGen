import type { IUserRepository } from "../../../user/domain/ports/UserRepository";
import type { IAuthRepository } from "../../domain/ports/AuthRepository";
import type { IPasswordHasher } from "../../domain/ports/PasswordHasher";
import { AuthError } from "../../domain/errors/AuthError";
import { PlainPassword } from "../../domain/value-objects/PlainPassword";

export interface IChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export class ChangePasswordUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly auth: IAuthRepository,
    private readonly passwords: IPasswordHasher,
  ) {}
  async execute(userId: string, input: IChangePasswordInput): Promise<void> {
    const user = await this.users.findById(userId);
    if (
      !user ||
      !(await this.passwords.verify(input.currentPassword, user.passwordHash))
    )
      throw new AuthError("INVALID_CREDENTIALS", "Credenciales inválidas.");
    const password = PlainPassword.create(input.newPassword);
    const hash = await this.passwords.hash(password);
    if (!(await this.auth.changePassword(user, hash)))
      throw new AuthError("INVALID_CREDENTIALS", "Credenciales inválidas.");
  }
}
