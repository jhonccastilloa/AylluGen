import jwt from "jsonwebtoken";
import { AuthError } from "@ayllugen/core/auth/domain/errors/AuthError";
import { JwtTokenService } from "../../../src/modules/auth/infrastructure/security/JwtTokenService";
import { config } from "../../../src/shared/constants/config";

const identity = { userId: "owner", dni: "12345678" };
const tokens = new JwtTokenService(config);

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test("issues signed access and refresh tokens with identity and standard claims", () => {
  const issued = tokens.issue(identity);
  expect(tokens.verifyAccess(issued.accessToken)).toEqual(identity);
  expect(tokens.verifyRefresh(issued.refreshToken)).toEqual(identity);
  expect(jwt.verify(issued.accessToken, config.jwtSecret)).toMatchObject({
    ...identity,
    tokenUse: "access",
    iat: expect.any(Number),
    exp: expect.any(Number),
  });
  expect(
    jwt.verify(issued.refreshToken, config.jwtRefreshSecret),
  ).toMatchObject({
    ...identity,
    tokenUse: "refresh",
    jti: expect.any(String),
  });
});

test("issues independent refresh tokens within the same second", () => {
  jest.useFakeTimers().setSystemTime(new Date("2026-11-01T12:00:00Z"));
  const first = tokens.issue(identity);
  const second = tokens.issue(identity);
  expect(first.refreshToken).not.toBe(second.refreshToken);
  expect((jwt.decode(first.refreshToken) as jwt.JwtPayload).jti).not.toBe(
    (jwt.decode(second.refreshToken) as jwt.JwtPayload).jti,
  );
});

test.each([
  { dni: "12345678" },
  { userId: "owner" },
  { userId: "", dni: "12345678" },
  { userId: "owner", dni: "" },
  { userId: 42, dni: "12345678" },
])("validates identity in both token types: %p", (payload) => {
  expect(() =>
    tokens.verifyAccess(
      jwt.sign({ ...payload, tokenUse: "access" }, config.jwtSecret),
    ),
  ).toThrow(jwt.JsonWebTokenError);
  expect(() =>
    tokens.verifyRefresh(
      jwt.sign({ ...payload, tokenUse: "refresh" }, config.jwtRefreshSecret),
    ),
  ).toThrow(AuthError);
});

test.each([undefined, "other", 42])(
  "rejects invalid token purpose: %s",
  (tokenUse) => {
    expect(() =>
      tokens.verifyAccess(
        jwt.sign({ ...identity, tokenUse }, config.jwtSecret),
      ),
    ).toThrow(jwt.JsonWebTokenError);
    expect(() =>
      tokens.verifyRefresh(
        jwt.sign({ ...identity, tokenUse }, config.jwtRefreshSecret),
      ),
    ).toThrow(AuthError);
  },
);

test("keeps access and refresh separate even when secrets are shared", () => {
  const shared = new JwtTokenService({
    ...config,
    jwtRefreshSecret: config.jwtSecret,
  });
  const issued = shared.issue(identity);
  expect(shared.verifyAccess(issued.accessToken)).toEqual(identity);
  expect(shared.verifyRefresh(issued.refreshToken)).toEqual(identity);
  expect(() => shared.verifyAccess(issued.refreshToken)).toThrow(
    "Invalid token payload",
  );
  expect(() => shared.verifyRefresh(issued.accessToken)).toThrow(AuthError);
});

test("preserves access expiry errors and translates expired refresh tokens to AuthError", () => {
  const access = jwt.sign(
    { ...identity, tokenUse: "access" },
    config.jwtSecret,
    { expiresIn: -1 },
  );
  const refresh = jwt.sign(
    { ...identity, tokenUse: "refresh" },
    config.jwtRefreshSecret,
    { expiresIn: -1 },
  );
  expect(() => tokens.verifyAccess(access)).toThrow(jwt.TokenExpiredError);
  expect(() => tokens.verifyRefresh(refresh)).toThrow(
    new AuthError(
      "INVALID_REFRESH_TOKEN",
      "Token de renovación inválido o expirado.",
    ),
  );
});

test("rejects malformed tokens and signatures from other secrets", () => {
  for (const token of [
    "invalid.token.here",
    jwt.sign({ ...identity, tokenUse: "access" }, "another-secret"),
  ]) {
    expect(() => tokens.verifyAccess(token)).toThrow(jwt.JsonWebTokenError);
  }
  for (const token of [
    "invalid.token.here",
    jwt.sign({ ...identity, tokenUse: "refresh" }, "another-secret"),
  ]) {
    expect(() => tokens.verifyRefresh(token)).toThrow(AuthError);
  }
});

test("uses configured human-readable durations and the issued refresh exp", () => {
  jest.useFakeTimers().setSystemTime(new Date("2026-11-01T12:00:00Z"));
  const service = new JwtTokenService({
    ...config,
    jwtExpiresIn: "15m",
    refreshTokenExpiresIn: "9d",
  });
  const issued = service.issue(identity);
  const access = jwt.decode(issued.accessToken) as jwt.JwtPayload;
  const refresh = jwt.decode(issued.refreshToken) as jwt.JwtPayload;
  expect(access.exp! - access.iat!).toBe(15 * 60);
  expect(refresh.exp! - refresh.iat!).toBe(9 * 24 * 60 * 60);
  jest.setSystemTime(new Date("2026-11-01T12:00:05Z"));
  expect(issued.refreshExpiresAt).toEqual(new Date("2026-11-10T12:00:00Z"));
  expect(issued.refreshExpiresAt.getTime()).toBe(refresh.exp! * 1000);
});

test.each([
  null,
  "invalid",
  {},
  { exp: "123" },
  { exp: NaN },
  { exp: Infinity },
  { exp: 1e20 },
])(
  "rejects invalid issued expiration instead of returning an invalid date: %p",
  (payload) => {
    // Exercise malformed decoded claims that the library's static types exclude.
    jest
      .spyOn(jwt, "decode")
      .mockReturnValue(payload as unknown as ReturnType<typeof jwt.decode>);
    expect(() => tokens.issue(identity)).toThrow(
      "Invalid refresh token expiration",
    );
  },
);

test("propagates unexpected verifier failures", () => {
  const failure = new Error("unexpected failure");
  jest.spyOn(jwt, "verify").mockImplementation(() => {
    throw failure;
  });
  expect(() => tokens.verifyRefresh("token")).toThrow(failure);
});
