import { User } from "../../modules/user/domain/entities/User";
import { UserResponse } from "../../modules/user/application/schemas/user.schema";

export class UserMapper {
  static toResponse(user: User): UserResponse {
    return {
      id: user.id,
      dni: user.dni,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static toResponseList(users: User[]): UserResponse[] {
    return users.map((u) => this.toResponse(u));
  }
}
