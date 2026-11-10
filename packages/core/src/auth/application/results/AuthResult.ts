import type { UserEntity } from "../../../user/domain/entities/UserEntity";

export interface IAuthResult {
  accessToken: string;
  refreshToken: string;
  user: UserEntity;
}
