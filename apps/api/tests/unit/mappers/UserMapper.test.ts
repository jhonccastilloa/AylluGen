import { UserMapper } from "../../../src/shared/mappers/UserMapper";
import { User } from "../../../src/modules/user/domain/entities/User";

describe("UserMapper", () => {
  const mockUser: User = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    dni: "12345678",
    password: "hashedPassword123",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  };

  describe("toResponse", () => {
    it("should map User to UserResponse correctly", () => {
      const result = UserMapper.toResponse(mockUser);

      expect(result).toEqual({
        id: mockUser.id,
        dni: mockUser.dni,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(result).not.toHaveProperty("password");
    });

    it("should handle dates correctly", () => {
      const result = UserMapper.toResponse(mockUser);

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("toResponseList", () => {
    it("should map array of Users to array of UserResponse", () => {
      const mockUsers: User[] = [
        mockUser,
        {
          ...mockUser,
          id: "223e4567-e89b-12d3-a456-426614174001",
          dni: "87654321",
        },
      ];

      const result = UserMapper.toResponseList(mockUsers);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: mockUsers[0].id,
        dni: mockUsers[0].dni,
        createdAt: mockUsers[0].createdAt,
        updatedAt: mockUsers[0].updatedAt,
      });
      expect(result[1]).toEqual({
        id: mockUsers[1].id,
        dni: mockUsers[1].dni,
        createdAt: mockUsers[1].createdAt,
        updatedAt: mockUsers[1].updatedAt,
      });
      result.forEach((user) => {
        expect(user).not.toHaveProperty("password");
      });
    });

    it("should handle empty array", () => {
      const result = UserMapper.toResponseList([]);

      expect(result).toEqual([]);
    });
  });
});
