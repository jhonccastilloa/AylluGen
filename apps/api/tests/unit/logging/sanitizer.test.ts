import {
  sanitize,
  sanitizeString,
} from "../../../src/shared/logging/sanitizer";

describe("Log Sanitizer", () => {
  describe("sanitize", () => {
    it("should sanitize password field", () => {
      const data = {
        username: "testuser",
        password: "SecretPassword123",
        email: "test@example.com",
      };

      const result = sanitize(data) as typeof data;

      expect(result.password).toBe("[REDACTED]");
      expect(result.username).toBe("testuser");
      expect(result.email).toBe("[REDACTED]");
    });

    it("should sanitize token field", () => {
      const data = {
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        refreshToken: "another.token.value",
      };

      const result = sanitize(data) as typeof data;

      expect(result.token).toBe("[REDACTED]");
      expect(result.refreshToken).toBe("[REDACTED]");
    });

    it("should sanitize apiKey field", () => {
      const data = {
        apiKey: "secret-api-key-123",
        name: "My App",
      };

      const result = sanitize(data) as typeof data;

      expect(result.apiKey).toBe("[REDACTED]");
      expect(result.name).toBe("My App");
    });

    it("should handle nested objects", () => {
      const data = {
        user: {
          name: "Test User",
          password: "userPassword",
        },
        meta: {
          token: "meta-token",
        },
      };

      const result = sanitize(data) as typeof data;

      expect(result.user.password).toBe("[REDACTED]");
      expect(result.user.name).toBe("Test User");
      expect(result.meta.token).toBe("[REDACTED]");
    });

    it("should handle arrays", () => {
      const data = {
        users: [
          { name: "User 1", password: "pass1" },
          { name: "User 2", password: "pass2" },
        ],
      };

      const result = sanitize(data) as typeof data;

      expect(result.users[0].password).toBe("[REDACTED]");
      expect(result.users[1].password).toBe("[REDACTED]");
      expect(result.users[0].name).toBe("User 1");
      expect(result.users[1].name).toBe("User 2");
    });

    it("should handle null and undefined", () => {
      const data = {
        name: "Test",
        password: "Secret123",
        nullValue: null,
        undefinedValue: undefined,
      };

      const result = sanitize(data) as typeof data;

      expect(result.password).toBe("[REDACTED]");
      expect(result.nullValue).toBeNull();
      expect(result.undefinedValue).toBeUndefined();
    });

    it("should handle Date objects", () => {
      const date = new Date("2024-01-01T00:00:00.000Z");
      const data = {
        date,
        password: "Secret123",
      };

      const result = sanitize(data) as { password: string; date: string };

      expect(result.password).toBe("[REDACTED]");
      expect(result.date).toBe(date.toISOString());
    });

    it("should handle Error objects", () => {
      const error = new Error("Test error");
      const data = {
        error,
        password: "Secret123",
      };

      const result = sanitize(data) as { password: string; error: unknown };

      expect(result.password).toBe("[REDACTED]");
      expect(result.error).toEqual({
        name: error.name,
        message: error.message,
        stack: undefined,
      });
    });

    it("should respect case insensitivity for sensitive keys", () => {
      const data = {
        Password: "capitalPassword",
        PASSWORD: "allcaps",
        password: "lowercase",
        passWord: "mixedcase",
      };

      const result = sanitize(data) as typeof data;

      expect(result.Password).toBe("[REDACTED]");
      expect(result.PASSWORD).toBe("[REDACTED]");
      expect(result.password).toBe("[REDACTED]");
      expect(result.passWord).toBe("[REDACTED]");
    });

    it("should handle empty objects", () => {
      const result = sanitize({});

      expect(result).toEqual({});
    });

    it("should limit recursion depth", () => {
      let data: any = {};
      let current = data;
      for (let i = 0; i < 15; i++) {
        current.nested = { password: `password${i}` };
        current = current.nested;
      }

      const result = sanitize(data) as typeof data;

      let nested = result;
      for (let depth = 0; depth < 11; depth++) nested = nested.nested;
      expect(nested).toEqual("[MAX_DEPTH_REACHED]");
    });

    it("should limit array length", () => {
      const largeArray = Array.from({ length: 150 }, (_, i) => ({
        id: i,
        password: `password${i}`,
      }));

      const result = sanitize(largeArray) as typeof largeArray;

      expect(result.length).toBe(101);
      expect(result[100]).toBe("[...50 more items]");
    });
  });

  describe("sanitizeString", () => {
    it("should sanitize password in string", () => {
      const input = '{"password":"Secret123","username":"test"}';
      const result = sanitizeString(input);

      expect(result).toContain('"password":"[REDACTED]"');
      expect(result).toContain('"username":"test"');
    });

    it("should sanitize token in string", () => {
      const input = '{"token":"secret-token","name":"My App"}';
      const result = sanitizeString(input);

      expect(result).toContain('"token":"[REDACTED]"');
      expect(result).toContain('"name":"My App"');
    });

    it("should handle multiple sensitive fields", () => {
      const input = '{"password":"pass1","token":"token1","apiKey":"key1"}';
      const result = sanitizeString(input);

      expect(result).toContain('"password":"[REDACTED]"');
      expect(result).toContain('"token":"[REDACTED]"');
      expect(result).toContain('"apiKey":"[REDACTED]"');
    });
  });
});
