import { RefreshTokenEntity } from "@ayllugen/core/auth/domain/entities/RefreshTokenEntity";
import { AuthError } from "@ayllugen/core/auth/domain/errors/AuthError";

describe("RefreshTokenEntity", () => {
  test.each([
    { userId: "" },
    { userId: "   " },
    { token: "" },
    { token: "\t " },
    { expiresAt: new Date(NaN) },
  ])("rejects invalid session data: %p", (invalid) => {
    expect(() =>
      RefreshTokenEntity.create({
        userId: "owner",
        token: "refresh-token",
        expiresAt: new Date("2030-01-01T00:00:00Z"),
        ...invalid,
      }),
    ).toThrow(AuthError);
  });

  test("accepts expired records and preserves the original token", () => {
    const expiresAt = new Date("2000-01-01T00:00:00Z");
    const session = RefreshTokenEntity.create({
      userId: "owner",
      token: " refresh-token ",
      expiresAt,
    });
    expect(session.token).toBe(" refresh-token ");
    expect(session.expiresAt).toEqual(expiresAt);
  });

  test("protects session data from input and date mutations", () => {
    const props = {
      userId: "owner",
      token: "refresh-token",
      expiresAt: new Date("2030-01-01T00:00:00Z"),
    };
    const session = RefreshTokenEntity.create(props);
    props.userId = "other";
    props.token = "replacement";
    props.expiresAt.setTime(0);
    session.expiresAt.setTime(0);

    expect(session.userId).toBe("owner");
    expect(session.token).toBe("refresh-token");
    expect(session.expiresAt.toISOString()).toBe("2030-01-01T00:00:00.000Z");
    expect(Reflect.set(session, "token", "replacement")).toBe(false);
  });
});
