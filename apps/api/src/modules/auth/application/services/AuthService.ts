import { injectable, inject } from "inversify";
import { IUserRepository } from "../../../user/domain/repositories/IUserRepository";
import { IRefreshTokenRepository } from "../../domain/repositories/IRefreshTokenRepository";
import { TYPES } from "../../../../shared/di/types";
import {
  RegisterDTO,
  LoginDTO,
  RefreshTokenDTO,
  AuthResponse,
  LogoutInputDTO,
} from "../schemas/auth.schema";
import { hashPassword, comparePassword } from "../../../../shared/utils/bcrypt";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  TokenPayload,
} from "../../../../shared/utils/jwt";
import { getRefreshTokenExpirationDate } from "../../../../shared/constants/tokens";
import {
  ConflictError,
  AuthenticationError,
  NotFoundError,
} from "../../../../shared/errors/AppError";
import { UserMapper } from "../../../../shared/mappers/UserMapper";
import { transaction } from "../../../../infrastructure/database/prisma/client";

@injectable()
export class AuthService {
  constructor(
    @inject(TYPES.IUserRepository) private userRepository: IUserRepository,
    @inject(TYPES.IRefreshTokenRepository)
    private refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async register(data: RegisterDTO): Promise<AuthResponse> {
    return await transaction(async (tx) => {
      this.userRepository.setTransactionClient(tx);
      this.refreshTokenRepository.setTransactionClient(tx);

      const existingUser = await this.userRepository.findByDni(data.dni);
      if (existingUser) {
        throw new ConflictError("El usuario ya existe");
      }

      const hashedPassword = await hashPassword(data.password);
      const user = await this.userRepository.create({
        dni: data.dni,
        password: hashedPassword,
      });

      const tokenPayload: TokenPayload = { userId: user.id, dni: user.dni };
      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      const refreshTokenExpiresAt = getRefreshTokenExpirationDate();

      await this.refreshTokenRepository.create(
        refreshToken,
        user.id,
        refreshTokenExpiresAt,
      );

      this.userRepository.setTransactionClient(null);
      this.refreshTokenRepository.setTransactionClient(null);

      return {
        accessToken,
        refreshToken,
        user: UserMapper.toResponse(user),
      };
    });
  }

  async login(data: LoginDTO): Promise<AuthResponse> {
    return await transaction(async (tx) => {
      this.userRepository.setTransactionClient(tx);
      this.refreshTokenRepository.setTransactionClient(tx);

      const user = await this.userRepository.findByDni(data.dni);
      if (!user) {
        throw new AuthenticationError("Credenciales inválidas");
      }

      const isPasswordValid = await comparePassword(
        data.password,
        user.password,
      );
      if (!isPasswordValid) {
        throw new AuthenticationError("Credenciales inválidas");
      }

      const tokenPayload: TokenPayload = { userId: user.id, dni: user.dni };
      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      const refreshTokenExpiresAt = getRefreshTokenExpirationDate();

      await this.refreshTokenRepository.deleteByUserId(user.id);
      await this.refreshTokenRepository.create(
        refreshToken,
        user.id,
        refreshTokenExpiresAt,
      );

      this.userRepository.setTransactionClient(null);
      this.refreshTokenRepository.setTransactionClient(null);

      return {
        accessToken,
        refreshToken,
        user: UserMapper.toResponse(user),
      };
    });
  }

  async refreshToken(data: RefreshTokenDTO): Promise<AuthResponse> {
    const existingToken = await this.refreshTokenRepository.findByToken(
      data.refreshToken,
    );
    if (!existingToken) {
      throw new AuthenticationError("Token de refresh inválido");
    }

    if (existingToken.expiresAt < new Date()) {
      await this.refreshTokenRepository.delete(data.refreshToken);
      throw new AuthenticationError("Token de refresh expirado");
    }

    const payload = verifyRefreshToken(data.refreshToken);
    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new NotFoundError("Usuario no encontrado");
    }

    const tokenPayload: TokenPayload = { userId: user.id, dni: user.dni };
    const accessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    const refreshTokenExpiresAt = getRefreshTokenExpirationDate();

    await this.refreshTokenRepository.delete(data.refreshToken);
    await this.refreshTokenRepository.create(
      newRefreshToken,
      user.id,
      refreshTokenExpiresAt,
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: UserMapper.toResponse(user),
    };
  }

  async logout(data: LogoutInputDTO): Promise<void> {
    await this.refreshTokenRepository.delete(data.refreshToken);
  }
}
