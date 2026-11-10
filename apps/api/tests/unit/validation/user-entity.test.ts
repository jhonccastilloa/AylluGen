import { UserEntity } from "@ayllugen/core/user/domain/entities/UserEntity";
import { UserError } from "@ayllugen/core/user/domain/errors/UserError";

const userProps = () => ({
  id: "owner",
  dni: "01234567",
  passwordHash: "stored-hash",
  createdAt: new Date("2020-01-01T00:00:00Z"),
  updatedAt: new Date("2021-01-01T00:00:00Z"),
});

describe("UserEntity", () => {
  test.each([
    { id: "" },
    { id: " \t " },
    { dni: "1234567" },
    { dni: "abcdefgh" },
    { passwordHash: "" },
    { passwordHash: " \t " },
    { createdAt: new Date(NaN) },
    { updatedAt: new Date(NaN) },
  ])("rejects invalid creation data: %p", (invalid) => {
    expect(() => UserEntity.create({ ...userProps(), ...invalid })).toThrow(
      UserError,
    );
  });

  test("accepts valid historical dates and preserves values without normalization", () => {
    const props = { ...userProps(), passwordHash: " stored-hash " };
    const user = UserEntity.create(props);
    expect(user.dni).toBe("01234567");
    expect(user.passwordHash).toBe(props.passwordHash);
    expect(user.createdAt).toEqual(props.createdAt);
    expect(user.updatedAt).toEqual(props.updatedAt);
  });

  test.each(["create", "restore"] as const)(
    "%s isolates properties and dates from external mutations",
    (method) => {
      const props = userProps();
      const user = UserEntity[method](props);
      props.id = "other";
      props.dni = "87654321";
      props.passwordHash = "replacement";
      props.createdAt.setTime(0);
      props.updatedAt.setTime(0);
      user.createdAt.setTime(1);
      user.updatedAt.setTime(1);

      expect(user.id).toBe("owner");
      expect(user.dni).toBe("01234567");
      expect(user.passwordHash).toBe("stored-hash");
      expect(user.createdAt.toISOString()).toBe("2020-01-01T00:00:00.000Z");
      expect(user.updatedAt.toISOString()).toBe("2021-01-01T00:00:00.000Z");
      expect(Reflect.set(user, "id", "other")).toBe(false);
    },
  );

  test("restore preserves persisted values without applying creation rules", () => {
    const props = { ...userProps(), dni: "1234567" };
    expect(() => UserEntity.create(props)).toThrow(UserError);
    expect(UserEntity.restore(props).dni).toBe(props.dni);
  });
});
