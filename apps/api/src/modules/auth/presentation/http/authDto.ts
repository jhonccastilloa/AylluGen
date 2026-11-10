import type { IUserResponseDto } from "../../../user/presentation/http/userDto";

export interface IAuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: IUserResponseDto;
}
