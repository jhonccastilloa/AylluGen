import type { IAuthRepository } from "../../domain/ports/AuthRepository";

export class LogoutUseCase {
  constructor(private readonly auth: IAuthRepository) {}
  execute(token: string): Promise<void> {
    return this.auth.closeSession(token);
  }
}
