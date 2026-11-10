import type { GetMyAccountUseCase } from "@ayllugen/core/user/application/use-cases/index";
import { ok } from "../../../../presentation/http/HttpResult";
import type { HttpResult } from "../../../../presentation/http/HttpResult";
import type { IUserResponseDto } from "./userDto";
import { UserDtoMapper } from "./UserDtoMapper";

interface IUserUseCases {
  getMyAccountUseCase: GetMyAccountUseCase;
}

export class UserController {
  constructor(private readonly useCases: IUserUseCases) {}
  async me(userId: string): Promise<HttpResult<IUserResponseDto>> {
    const user = await this.useCases.getMyAccountUseCase.execute(userId);
    return ok(UserDtoMapper.toResponse(user));
  }
}
