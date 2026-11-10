import type { UserEntity } from "@ayllugen/core/user/domain/entities/UserEntity";
import type { IUserResponseDto } from "./userDto";

export class UserDtoMapper {
  static toResponse(user: UserEntity): IUserResponseDto {
    return {
      id: user.id,
      dni: user.dni,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
