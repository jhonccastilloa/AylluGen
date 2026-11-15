import { AnimalEntity } from "@ayllugen/core/animal/domain/entities/AnimalEntity";
import type { IAnimalProps } from "@ayllugen/core/animal/domain/entities/AnimalEntity";

const props = (): IAnimalProps => ({
  id: "animal",
  userId: "owner",
  code: " a-01 ",
  crotal: " tag-01 ",
  speciesId: "species",
  sex: "MALE",
  birthDate: "2020-02-29",
  fatherId: null,
  motherId: null,
  status: "ACTIVE",
  exitDate: null,
  createdAt: new Date("2020-01-01"),
  updatedAt: new Date("2020-01-01"),
});

describe("Animal entity invariants", () => {
  test("normalizes identifiers, derives founders and copies mutable dates", () => {
    const input = props();
    const animal = AnimalEntity.create(input);
    input.code = "MUTATED";
    input.createdAt.setUTCFullYear(1990);
    animal.updatedAt.setUTCFullYear(1990);
    expect(animal.code).toBe("A-01");
    expect(animal.crotal).toBe("TAG-01");
    expect(animal.createdAt.getUTCFullYear()).toBe(2020);
    expect(animal.updatedAt.getUTCFullYear()).toBe(2020);
    expect(animal.isFounder).toBe(true);
    expect(
      AnimalEntity.create({ ...props(), motherId: "mother" }).isFounder,
    ).toBe(false);
  });

  test.each([
    "2023-02-29",
    "2020-13-01",
    "2020-01-01T00:00:00Z",
    "0000-01-01",
    "2099-01-01",
  ])("rejects invalid or future calendar date %s", (birthDate) => {
    expect(() =>
      AnimalEntity.create({ ...props(), birthDate }, "2026-01-01"),
    ).toThrow(expect.objectContaining({ code: "ANIMAL_INVALID_DATES" }));
  });

  test.each([
    { code: " " },
    { code: "A".repeat(51) },
    { crotal: " " },
    { crotal: "A".repeat(51) },
    { speciesId: " " },
    { updatedAt: new Date(NaN) },
  ])("rejects invalid identity or technical dates %p", (changes) => {
    expect(() => AnimalEntity.create({ ...props(), ...changes })).toThrow(
      expect.objectContaining({ code: "ANIMAL_INVALID" }),
    );
  });

  test("validates exit dates without requiring a date for historical exits", () => {
    expect(
      AnimalEntity.create({ ...props(), status: "SOLD" }).exitDate,
    ).toBeNull();
    expect(() =>
      AnimalEntity.create({ ...props(), exitDate: "2021-01-01" }),
    ).toThrow();
    expect(() =>
      AnimalEntity.create({
        ...props(),
        status: "DECEASED",
        exitDate: "2019-01-01",
      }),
    ).toThrow();
  });

  test.each([
    { fatherId: "animal" },
    { motherId: "animal" },
    { fatherId: "same", motherId: "same" },
  ])("rejects self or duplicate parents %p", (changes) => {
    expect(() => AnimalEntity.create({ ...props(), ...changes })).toThrow(
      expect.objectContaining({ code: "ANIMAL_INVALID_PARENT" }),
    );
  });

  test("restore trusts typed persistence but still copies its inputs", () => {
    const input = props();
    const animal = AnimalEntity.restore(input);
    input.updatedAt.setUTCFullYear(1999);
    expect(animal.code).toBe(" a-01 ");
    expect(animal.updatedAt.getUTCFullYear()).toBe(2020);
  });
});
