import { decode, JsonWebTokenError, sign } from "jsonwebtoken";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  getRefreshTokenExpirationDate,
} from "../../src/shared/utils/jwt";
import { config } from "../../src/shared/constants/config";

test("accepts generated access and refresh tokens with standard JWT claims", () => {
  const identity = { userId: "owner", dni: "12345678" };
  expect(verifyToken(generateAccessToken(identity))).toEqual(identity);
  expect(verifyRefreshToken(generateRefreshToken(identity))).toEqual(identity);
});

test("validates identity in refresh tokens too", () => {
  const token = sign(
    { dni: "12345678", tokenUse: "refresh" },
    config.jwtRefreshSecret,
  );
  expect(() => verifyRefreshToken(token)).toThrow(JsonWebTokenError);
});

test.each([undefined, "other", 42])(
  "rejects missing or invalid token purpose: %s",
  (tokenUse) => {
    const identity = { userId: "owner", dni: "12345678", tokenUse };
    expect(() => verifyToken(sign(identity, config.jwtSecret))).toThrow(
      JsonWebTokenError,
    );
    expect(() =>
      verifyRefreshToken(sign(identity, config.jwtRefreshSecret)),
    ).toThrow(JsonWebTokenError);
  },
);

test("keeps access and refresh tokens separate even when secrets are shared", () => {
  const previous = process.env.REFRESH_TOKEN_SECRET;
  delete process.env.REFRESH_TOKEN_SECRET;
  try {
    jest.isolateModules(() => {
      const utils =
        require("../../src/shared/utils/jwt") as typeof import("../../src/shared/utils/jwt");
      const identity = { userId: "owner", dni: "12345678" };
      const access = utils.generateAccessToken(identity);
      const refresh = utils.generateRefreshToken(identity);
      expect(decode(access)).toMatchObject({ tokenUse: "access" });
      expect(decode(refresh)).toMatchObject({ tokenUse: "refresh" });
      expect(utils.verifyToken(access)).toEqual(identity);
      expect(utils.verifyRefreshToken(refresh)).toEqual(identity);
      expect(() => utils.verifyToken(refresh)).toThrow("Invalid token payload");
      expect(() => utils.verifyRefreshToken(access)).toThrow(
        "Invalid token payload",
      );
    });
  } finally {
    if (previous === undefined) delete process.env.REFRESH_TOKEN_SECRET;
    else process.env.REFRESH_TOKEN_SECRET = previous;
  }
});

test("uses the issued token expiration with a configured nine-day lifetime", () => {
  const previous = process.env.REFRESH_TOKEN_EXPIRES_IN;
  process.env.REFRESH_TOKEN_EXPIRES_IN = "9d";
  jest.useFakeTimers().setSystemTime(new Date("2026-11-01T12:00:00Z"));
  try {
    jest.isolateModules(() => {
      const utils =
        require("../../src/shared/utils/jwt") as typeof import("../../src/shared/utils/jwt");
      const token = utils.generateRefreshToken({
        userId: "owner",
        dni: "12345678",
      });
      const claims = decode(token) as { exp: number; iat: number };
      expect(claims.exp - claims.iat).toBe(9 * 24 * 60 * 60);
      jest.setSystemTime(new Date("2026-11-01T12:00:05Z"));
      expect(utils.getRefreshTokenExpirationDate(token)).toEqual(
        new Date("2026-11-10T12:00:00Z"),
      );
      expect(utils.getRefreshTokenExpirationDate(token).getTime()).toBe(
        claims.exp * 1000,
      );
    });
  } finally {
    jest.useRealTimers();
    if (previous === undefined) delete process.env.REFRESH_TOKEN_EXPIRES_IN;
    else process.env.REFRESH_TOKEN_EXPIRES_IN = previous;
  }
});

test("rejects missing or invalid expiration instead of persisting an invalid date", () => {
  for (const token of [
    "invalid",
    sign({ userId: "owner" }, config.jwtRefreshSecret),
    sign({ exp: 1e20 }, config.jwtRefreshSecret),
  ]) {
    expect(() => getRefreshTokenExpirationDate(token)).toThrow(
      JsonWebTokenError,
    );
  }
});
