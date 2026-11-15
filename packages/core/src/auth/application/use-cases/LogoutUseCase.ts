import type { IAuthRepository } from "../../domain/ports/AuthRepository";

export class LogoutUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}
  execute(token: string): Promise<void> {
    return this.authRepository.closeSession(token);
  }
}
