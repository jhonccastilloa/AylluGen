import { AuthService } from "../../../../src/modules/auth/application/services/AuthService";
import { IUserRepository } from "../../../../src/modules/user/domain/repositories/IUserRepository";
import { IRefreshTokenRepository } from "../../../../src/modules/auth/domain/repositories/IRefreshTokenRepository";
import { User } from "../../../../src/modules/user/domain/entities/User";
import { RefreshToken } from "../../../../src/modules/auth/domain/entities/RefreshToken";
import {
  ConflictError,
  AuthenticationError,
  NotFoundError,
} from "../../../../src/shared/errors/AppError";
import { TYPES } from "../../../../src/shared/di/types";
import { Container } from "inversify";
import { hashPassword } from "../../../../src/shared/utils/bcrypt";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../../../src/shared/utils/jwt";
import { transaction } from "../../../../src/infrastructure/database/prisma/client";

jest.mock("../../../../src/infrastructure/database/prisma/client");
jest.mock("../../../../src/shared/utils/bcrypt");
jest.mock("../../../../src/shared/utils/jwt");

describe("AuthService", () => {
  let authService: AuthService;
  let userRepository: jest.Mocked<IUserRepository>;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;
  let container: Container;

  const mockUser: User = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    dni: "12345678",
    password: "hashedPassword123",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  };

  const mockRefreshToken: RefreshToken = {
    id: "refresh-token-id",
    token: "refresh-token-value",
    userId: mockUser.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  };

  beforeEach(() => {
    container = new Container({ autobind: true });
    userRepository = {
      findById: jest.fn(),
      findByDni: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      setTransactionClient: jest.fn(),
    };

    refreshTokenRepository = {
      findByToken: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteByUserId: jest.fn(),
      setTransactionClient: jest.fn(),
    };

    container
      .bind<IUserRepository>(TYPES.IUserRepository)
      .toConstantValue(userRepository);
    container
      .bind<IRefreshTokenRepository>(TYPES.IRefreshTokenRepository)
      .toConstantValue(refreshTokenRepository);
    authService = container.get<AuthService>(AuthService);

    (transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback(null);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      userRepository.findByDni.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(mockUser);
      refreshTokenRepository.create.mockResolvedValue(mockRefreshToken);
      (hashPassword as jest.Mock).mockResolvedValue("hashedPassword123");
      (generateAccessToken as jest.Mock).mockReturnValue("access-token");
      (generateRefreshToken as jest.Mock).mockReturnValue("refresh-token");

      const result = await authService.register({
        dni: "12345678",
        password: "Password123!",
      });

      expect(result).toEqual({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        user: {
          id: mockUser.id,
          dni: mockUser.dni,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
      });
      expect(userRepository.findByDni).toHaveBeenCalledWith("12345678");
      expect(userRepository.create).toHaveBeenCalledWith({
        dni: "12345678",
        password: "hashedPassword123",
      });
      expect(refreshTokenRepository.create).toHaveBeenCalled();
    });

    it("should throw ConflictError when user already exists", async () => {
      userRepository.findByDni.mockResolvedValue(mockUser);

      await expect(
        authService.register({
          dni: "12345678",
          password: "Password123!",
        }),
      ).rejects.toThrow(ConflictError);
      expect(userRepository.findByDni).toHaveBeenCalledWith("12345678");
    });
  });

  describe("login", () => {
    it("should login user successfully with valid credentials", async () => {
      userRepository.findByDni.mockResolvedValue(mockUser);
      refreshTokenRepository.deleteByUserId.mockResolvedValue(undefined);
      refreshTokenRepository.create.mockResolvedValue(mockRefreshToken);
      (generateAccessToken as jest.Mock).mockReturnValue("access-token");
      (generateRefreshToken as jest.Mock).mockReturnValue("refresh-token");

      const {
        comparePassword,
      } = require("../../../../src/shared/utils/bcrypt");
      comparePassword.mockResolvedValue(true);

      const result = await authService.login({
        dni: "12345678",
        password: "Password123!",
      });

      expect(result).toEqual({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        user: {
          id: mockUser.id,
          dni: mockUser.dni,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
      });
      expect(userRepository.findByDni).toHaveBeenCalledWith("12345678");
    });

    it("should throw AuthenticationError when user does not exist", async () => {
      userRepository.findByDni.mockResolvedValue(null);

      await expect(
        authService.login({
          dni: "12345678",
          password: "Password123!",
        }),
      ).rejects.toThrow(AuthenticationError);
    });

    it("should throw AuthenticationError when password is invalid", async () => {
      userRepository.findByDni.mockResolvedValue(mockUser);

      const {
        comparePassword,
      } = require("../../../../src/shared/utils/bcrypt");
      comparePassword.mockResolvedValue(false);

      await expect(
        authService.login({
          dni: "12345678",
          password: "WrongPassword123!",
        }),
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe("refreshToken", () => {
    it("should refresh token successfully", async () => {
      refreshTokenRepository.findByToken.mockResolvedValue(mockRefreshToken);
      userRepository.findById.mockResolvedValue(mockUser);
      refreshTokenRepository.delete.mockResolvedValue(undefined);
      refreshTokenRepository.create.mockResolvedValue(mockRefreshToken);
      (generateAccessToken as jest.Mock).mockReturnValue("new-access-token");
      (generateRefreshToken as jest.Mock).mockReturnValue("new-refresh-token");

      const {
        verifyRefreshToken,
      } = require("../../../../src/shared/utils/jwt");
      verifyRefreshToken.mockReturnValue({
        userId: mockUser.id,
        dni: mockUser.dni,
      });

      const result = await authService.refreshToken({
        refreshToken: "refresh-token-value",
      });

      expect(result).toEqual({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        user: {
          id: mockUser.id,
          dni: mockUser.dni,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
      });
      expect(refreshTokenRepository.findByToken).toHaveBeenCalledWith(
        "refresh-token-value",
      );
    });

    it("should throw AuthenticationError when refresh token is invalid", async () => {
      refreshTokenRepository.findByToken.mockResolvedValue(null);

      await expect(
        authService.refreshToken({
          refreshToken: "invalid-token",
        }),
      ).rejects.toThrow(AuthenticationError);
    });

    it("should throw AuthenticationError when refresh token is expired", async () => {
      const expiredToken = {
        ...mockRefreshToken,
        expiresAt: new Date(Date.now() - 1000),
      };
      refreshTokenRepository.findByToken.mockResolvedValue(expiredToken);
      refreshTokenRepository.delete.mockResolvedValue(undefined);

      await expect(
        authService.refreshToken({
          refreshToken: "expired-token",
        }),
      ).rejects.toThrow(AuthenticationError);
    });

    it("should throw NotFoundError when user not found", async () => {
      refreshTokenRepository.findByToken.mockResolvedValue(mockRefreshToken);
      userRepository.findById.mockResolvedValue(null);

      const {
        verifyRefreshToken,
      } = require("../../../../src/shared/utils/jwt");
      verifyRefreshToken.mockReturnValue({
        userId: mockUser.id,
        dni: mockUser.dni,
      });

      await expect(
        authService.refreshToken({
          refreshToken: "refresh-token-value",
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("logout", () => {
    it("should logout user successfully", async () => {
      refreshTokenRepository.delete.mockResolvedValue(undefined);

      await authService.logout({
        refreshToken: "refresh-token-value",
      });

      expect(refreshTokenRepository.delete).toHaveBeenCalledWith(
        "refresh-token-value",
      );
    });
  });
});
