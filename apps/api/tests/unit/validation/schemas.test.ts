import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from "../../../src/modules/auth/presentation/http/authSchema";
import { PlainPassword } from "@ayllugen/core/auth/domain/value-objects/PlainPassword";

describe("Account input validation", () => {
  test.each(["123", "abcdefgh", "123456789"])(
    "rejects invalid DNI %s",
    (dni) => {
      expect(
        registerSchema.safeParse({ dni, password: "Password123!" }).success,
      ).toBe(false);
    },
  );
  test.each([
    "password123!",
    "PASSWORD123!",
    "Password!",
    "Password123",
    "Pass1!",
    "A1!" + "é".repeat(35),
  ])("rejects invalid new password in the core: %s", (password) => {
    expect(() => PlainPassword.create(password)).toThrow();
  });
  test("accepts exactly 72 UTF-8 bytes without trimming or changing the password", () => {
    const value = "Aa1!" + "é".repeat(34);
    expect(PlainPassword.create(value).value).toBe(value);
  });
  test("preserves the original value but redacts string and JSON representations", () => {
    const value = " Password123! ";
    const password = PlainPassword.create(value);
    expect(password.value).toBe(value);
    expect(String(password)).toBe("[REDACTED]");
    expect(JSON.stringify({ password })).toBe('{"password":"[REDACTED]"}');
    expect({ ...password }).toEqual({});
  });
  test("login does not require meeting new-password complexity rules", () => {
    expect(
      loginSchema.safeParse({ dni: "01234567", password: "legacy" }).success,
    ).toBe(true);
  });
  test("requires a refresh token and both passwords for a password change", () => {
    expect(refreshTokenSchema.safeParse({}).success).toBe(false);
    expect(refreshTokenSchema.safeParse({ refreshToken: "" }).success).toBe(
      false,
    );
    expect(
      changePasswordSchema.safeParse({ newPassword: "Password123!" }).success,
    ).toBe(false);
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "old",
        newPassword: "Password123!",
      }).success,
    ).toBe(true);
  });
});
