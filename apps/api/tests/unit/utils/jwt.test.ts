import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  TokenPayload,
} from "../../../src/shared/utils/jwt";
import { TOKEN_CONFIG } from "../../../src/shared/constants/tokens";

describe("JWT Utils", () => {
  const mockPayload: TokenPayload = {
    userId: "123e4567-e89b-12d3-a456-426614174000",
    dni: "12345678",
  };

  describe("generateAccessToken", () => {
    it("should generate a valid access token", () => {
      const token = generateAccessToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
    });

    it("should contain correct payload in token", () => {
      const token = generateAccessToken(mockPayload);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.dni).toBe(mockPayload.dni);
    });
  });

  describe("generateRefreshToken", () => {
    it("should generate a valid refresh token", () => {
      const token = generateRefreshToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
    });

    it("should contain correct payload in refresh token", () => {
      const token = generateRefreshToken(mockPayload);
      const decoded = verifyRefreshToken(token);

      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.dni).toBe(mockPayload.dni);
    });
  });

  describe("verifyToken", () => {
    it("should verify a valid access token", () => {
      const token = generateAccessToken(mockPayload);
      const decoded = verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.dni).toBe(mockPayload.dni);
    });

    it("should verify a valid refresh token with isRefreshToken flag", () => {
      const token = generateRefreshToken(mockPayload);
      const decoded = verifyToken(token, true);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.dni).toBe(mockPayload.dni);
    });

    it("should throw error for invalid token", () => {
      expect(() => {
        verifyToken("invalid.token.here");
      }).toThrow();
    });

    it("should throw error for expired token", () => {
      const expiredPayload: TokenPayload & { exp: number } = {
        userId: mockPayload.userId,
        dni: mockPayload.dni,
        exp: Math.floor(Date.now() / 1000) - 3600,
      };

      const token = Buffer.from(JSON.stringify(expiredPayload)).toString(
        "base64",
      );

      expect(() => {
        verifyToken(token);
      }).toThrow();
    });
  });

  describe("verifyRefreshToken", () => {
    it("should verify a valid refresh token", () => {
      const token = generateRefreshToken(mockPayload);
      const decoded = verifyRefreshToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.dni).toBe(mockPayload.dni);
    });

    it("should use refresh token secret", () => {
      const accessToken = generateAccessToken(mockPayload);
      const refreshToken = generateRefreshToken(mockPayload);

      expect(() => {
        verifyRefreshToken(accessToken);
      }).toThrow();

      expect(() => {
        verifyToken(refreshToken, true);
      }).not.toThrow();
    });
  });

  describe("Token Configuration", () => {
    it("should have defined access token config", () => {
      expect(TOKEN_CONFIG.ACCESS_TOKEN).toBeDefined();
      expect(TOKEN_CONFIG.ACCESS_TOKEN.secret).toBeDefined();
      expect(TOKEN_CONFIG.ACCESS_TOKEN.expiresIn).toBeDefined();
    });

    it("should have defined refresh token config", () => {
      expect(TOKEN_CONFIG.REFRESH_TOKEN).toBeDefined();
      expect(TOKEN_CONFIG.REFRESH_TOKEN.secret).toBeDefined();
      expect(TOKEN_CONFIG.REFRESH_TOKEN.expiresIn).toBeDefined();
      expect(TOKEN_CONFIG.REFRESH_TOKEN.days).toBeGreaterThan(0);
    });
  });
});
