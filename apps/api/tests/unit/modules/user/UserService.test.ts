import { UserService } from "../../../../src/modules/user/application/services/UserService";
import { IUserRepository } from "../../../../src/modules/user/domain/repositories/IUserRepository";
import { User } from "../../../../src/modules/user/domain/entities/User";
import { NotFoundError } from "../../../../src/shared/errors/AppError";
import { TYPES } from "../../../../src/shared/di/types";
import { Container } from "inversify";
import { comparePassword } from "../../../../src/shared/utils/bcrypt";

describe("UserService", () => {
  let userService: UserService;
  let userRepository: jest.Mocked<IUserRepository>;
  let container: Container;

  const mockUser: User = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    dni: "12345678",
    password: "hashedPassword123",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
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

    container
      .bind<IUserRepository>(TYPES.IUserRepository)
      .toConstantValue(userRepository);
    userService = container.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getProfile", () => {
    it("should return user profile when user exists", async () => {
      userRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.getProfile(mockUser.id);

      expect(result).toEqual({
        id: mockUser.id,
        dni: mockUser.dni,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(userRepository.findById).toHaveBeenCalledWith(mockUser.id);
    });

    it("should throw NotFoundError when user does not exist", async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(userService.getProfile("non-existent-id")).rejects.toThrow(
        NotFoundError,
      );
      expect(userRepository.findById).toHaveBeenCalledWith("non-existent-id");
    });
  });

  describe("getById", () => {
    it("should return user when user exists", async () => {
      userRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.getById(mockUser.id);

      expect(result).toEqual({
        id: mockUser.id,
        dni: mockUser.dni,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(userRepository.findById).toHaveBeenCalledWith(mockUser.id);
    });

    it("should throw NotFoundError when user does not exist", async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(userService.getById("non-existent-id")).rejects.toThrow(
        NotFoundError,
      );
      expect(userRepository.findById).toHaveBeenCalledWith("non-existent-id");
    });
  });

  describe("updateUser", () => {
    it("should update user password successfully", async () => {
      const updatedUser = {
        ...mockUser,
        password: "newHashedPassword",
      };
      userRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUser(mockUser.id, {
        password: "NewPassword123!",
      });

      expect(result).toEqual({
        id: updatedUser.id,
        dni: updatedUser.dni,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      });
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, {
        password: expect.stringMatching(/^\$2[aby]\$/),
      });
      const storedPassword = userRepository.update.mock.calls[0][1].password!;
      expect(await comparePassword("NewPassword123!", storedPassword)).toBe(
        true,
      );
    });

    it("should handle update without password field", async () => {
      const updatedUser = { ...mockUser };
      userRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUser(mockUser.id, {});

      expect(result).toEqual({
        id: updatedUser.id,
        dni: updatedUser.dni,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      });
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, {});
    });
  });

  describe("deleteUser", () => {
    it("should delete user successfully", async () => {
      userRepository.delete.mockResolvedValue(undefined);

      await userService.deleteUser(mockUser.id);

      expect(userRepository.delete).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
