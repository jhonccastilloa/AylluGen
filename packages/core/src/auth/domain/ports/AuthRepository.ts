import type { UserEntity } from "../../../user/domain/entities/UserEntity";
import type { RefreshTokenEntity } from "../entities/RefreshTokenEntity";

/** Atomic persistence operations for accounts and sessions. No shared transaction state. */
export interface IAuthRepository {
  register(user: UserEntity, session: RefreshTokenEntity): Promise<UserEntity>;
  openSession(user: UserEntity, session: RefreshTokenEntity): Promise<boolean>;
  rotateSession(
    user: UserEntity,
    previousToken: string,
    session: RefreshTokenEntity,
  ): Promise<boolean>;
  closeSession(token: string): Promise<void>;
  changePassword(user: UserEntity, passwordHash: string): Promise<boolean>;
}
