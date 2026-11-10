import type { IAuthResult } from "@ayllugen/core/auth/application/results/AuthResult";
import { UserDtoMapper } from "../../../user/presentation/http/UserDtoMapper";
import type { IAuthResponseDto } from "./authDto";

export class AuthDtoMapper {
  static toResponse(result: IAuthResult): IAuthResponseDto {
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: UserDtoMapper.toResponse(result.user),
    };
  }
}
