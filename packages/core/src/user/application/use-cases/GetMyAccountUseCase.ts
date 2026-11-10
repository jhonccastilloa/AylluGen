import type { IUserRepository } from "../../domain/ports/UserRepository";
import { UserError } from "../../domain/errors/UserError";
import type { UserEntity } from "../../domain/entities/UserEntity";

export class GetMyAccountUseCase {
  constructor(private readonly users: IUserRepository) {}
  async execute(userId: string): Promise<UserEntity> {
    const user = await this.users.findById(userId);
    if (!user) throw new UserError("USER_NOT_FOUND", "Cuenta no encontrada.");
    return user;
  }
}
