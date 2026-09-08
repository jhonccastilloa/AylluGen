import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from "../../../src/modules/auth/application/schemas/auth.schema";
import { updateUserSchema } from "../../../src/modules/user/application/schemas/user.schema";

describe("Auth Schemas", () => {
  describe("registerSchema", () => {
    it("should validate correct data", () => {
      const validData = {
        dni: "12345678",
        password: "Password123!",
      };

      const result = registerSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it("should reject invalid DNI (not 8 digits)", () => {
      const invalidData = {
        dni: "123456",
        password: "Password123!",
      };

      const result = registerSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            path: ["dni"],
          }),
        );
      }
    });

    it("should reject DNI with letters", () => {
      const invalidData = {
        dni: "abcdefgh",
        password: "Password123!",
      };

      const result = registerSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it("should reject weak password (no uppercase)", () => {
      const invalidData = {
        dni: "12345678",
        password: "password123!",
      };

      const result = registerSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it("should reject weak password (no lowercase)", () => {
      const invalidData = {
        dni: "12345678",
        password: "PASSWORD123!",
      };

      const result = registerSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it("should reject weak password (no number)", () => {
      const invalidData = {
        dni: "12345678",
        password: "Password!",
      };

      const result = registerSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it("should reject weak password (no special character)", () => {
      const invalidData = {
        dni: "12345678",
        password: "Password123",
      };

      const result = registerSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it("should reject password shorter than 8 characters", () => {
      const invalidData = {
        dni: "12345678",
        password: "Pass1!",
      };

      const result = registerSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("should validate correct data", () => {
      const validData = {
        dni: "12345678",
        password: "Password123!",
      };

      const result = loginSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it("should accept any password for login", () => {
      const validData = {
        dni: "12345678",
        password: "any",
      };

      const result = loginSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });
  });

  describe("refreshTokenSchema", () => {
    it("should validate correct data", () => {
      const validData = {
        refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      };

      const result = refreshTokenSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it("should reject missing refreshToken", () => {
      const invalidData = {};

      const result = refreshTokenSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });
});

describe("User Schemas", () => {
  describe("updateUserSchema", () => {
    it("should validate correct password update", () => {
      const validData = {
        password: "NewPassword123!",
      };

      const result = updateUserSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it("should accept empty object (no update)", () => {
      const validData = {};

      const result = updateUserSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it("should reject weak password in update", () => {
      const invalidData = {
        password: "weak",
      };

      const result = updateUserSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });
});
