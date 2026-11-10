import { SpecieEntity } from "@ayllugen/core/species/domain/entities/SpecieEntity";
import { SpecieError } from "@ayllugen/core/species/domain/errors/SpecieError";

const specieProps = () => ({
  id: "specie",
  userId: "owner",
  name: "Alpaca",
  description: "Descripción",
});

describe("SpecieEntity", () => {
  test.each([
    { id: " \t " },
    { userId: " \t " },
    { name: "A" },
    { name: "A".repeat(81) },
    { description: "A".repeat(201) },
  ])("rejects invalid creation data: %p", (invalid) => {
    expect(() => SpecieEntity.create({ ...specieProps(), ...invalid })).toThrow(
      SpecieError,
    );
  });

  test.each(["create", "restore"] as const)(
    "%s isolates properties from external mutations",
    (method) => {
      const props = specieProps();
      const specie = SpecieEntity[method](props);
      props.id = "other";
      props.userId = "another-owner";
      props.name = "Ovino";
      props.description = "Otra descripción";

      expect(specie.id).toBe("specie");
      expect(specie.userId).toBe("owner");
      expect(specie.name).toBe("Alpaca");
      expect(specie.description).toBe("Descripción");
      expect(Reflect.set(specie, "name", "Ovino")).toBe(false);
    },
  );

  test("normalizes on creation and preserves persisted text on restore", () => {
    const props = { ...specieProps(), name: " Alpaca ", description: "   " };
    const created = SpecieEntity.create(props);
    const restored = SpecieEntity.restore(props);
    expect(created.name).toBe("Alpaca");
    expect(created.description).toBeNull();
    expect(restored.name).toBe(props.name);
    expect(restored.description).toBe(props.description);
  });

  test("restore does not reapply creation rules to persisted data", () => {
    const props = { ...specieProps(), name: "A" };
    expect(() => SpecieEntity.create(props)).toThrow(SpecieError);
    expect(SpecieEntity.restore(props).name).toBe("A");
  });
});
