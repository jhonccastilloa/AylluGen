import { Animal, Sex, SyncStatus } from "../../../../src/modules/animal/domain/entities/Animal";
import { RiskLevel } from "../../../../src/modules/breeding/domain/entities/Breeding";
import { GeneticEngine } from "../../../../src/modules/breeding/domain/services/GeneticEngine";

const baseDate = new Date("2024-01-01T00:00:00.000Z");

const createAnimal = (
  id: string,
  overrides: Partial<Animal> = {},
): Animal => ({
  id,
  crotal: id,
  sex: Sex.MALE,
  speciesId: "species-1",
  species: "OVINE",
  isFounder: true,
  userId: "user-1",
  syncStatus: SyncStatus.SYNCED,
  syncVersion: 1,
  createdAt: baseDate,
  updatedAt: baseDate,
  ...overrides,
});

describe("GeneticEngine (Wright COI)", () => {
  const engine = new GeneticEngine();

  it("returns 0 for unrelated founders", () => {
    const male = createAnimal("male", { sex: Sex.MALE });
    const female = createAnimal("female", { sex: Sex.FEMALE });
    const pedigree = new Map<string, Animal>([
      [male.id, male],
      [female.id, female],
    ]);

    const result = engine.calculateCOI(male, female, pedigree);

    expect(result.coi).toBe(0);
    expect(result.riskLevel).toBe(RiskLevel.GREEN);
  });

  it("calculates 0.25 for full sibling mating", () => {
    const father = createAnimal("father");
    const mother = createAnimal("mother", { sex: Sex.FEMALE });
    const male = createAnimal("male", {
      fatherId: father.id,
      motherId: mother.id,
    });
    const female = createAnimal("female", {
      sex: Sex.FEMALE,
      fatherId: father.id,
      motherId: mother.id,
    });

    const pedigree = new Map<string, Animal>([
      [father.id, father],
      [mother.id, mother],
      [male.id, male],
      [female.id, female],
    ]);

    const result = engine.calculateCOI(male, female, pedigree);

    expect(result.coi).toBeCloseTo(0.25, 8);
    expect(result.riskLevel).toBe(RiskLevel.RED);
  });

  it("calculates 0.125 for half sibling mating", () => {
    const sharedFather = createAnimal("shared-father");
    const maleMother = createAnimal("male-mother", { sex: Sex.FEMALE });
    const femaleMother = createAnimal("female-mother", { sex: Sex.FEMALE });
    const male = createAnimal("male", {
      fatherId: sharedFather.id,
      motherId: maleMother.id,
    });
    const female = createAnimal("female", {
      sex: Sex.FEMALE,
      fatherId: sharedFather.id,
      motherId: femaleMother.id,
    });

    const pedigree = new Map<string, Animal>([
      [sharedFather.id, sharedFather],
      [maleMother.id, maleMother],
      [femaleMother.id, femaleMother],
      [male.id, male],
      [female.id, female],
    ]);

    const result = engine.calculateCOI(male, female, pedigree);

    expect(result.coi).toBeCloseTo(0.125, 8);
  });

  it("calculates 0.25 for parent-child mating", () => {
    const father = createAnimal("father");
    const mother = createAnimal("mother", { sex: Sex.FEMALE });
    const daughter = createAnimal("daughter", {
      sex: Sex.FEMALE,
      fatherId: father.id,
      motherId: mother.id,
    });

    const pedigree = new Map<string, Animal>([
      [father.id, father],
      [mother.id, mother],
      [daughter.id, daughter],
    ]);

    const result = engine.calculateCOI(father, daughter, pedigree);

    expect(result.coi).toBeCloseTo(0.25, 8);
  });

  it("calculates 0.0625 for first cousin mating", () => {
    const grandFather = createAnimal("grand-father");
    const grandMother = createAnimal("grand-mother", { sex: Sex.FEMALE });
    const uncle = createAnimal("uncle", {
      fatherId: grandFather.id,
      motherId: grandMother.id,
    });
    const aunt = createAnimal("aunt", {
      sex: Sex.FEMALE,
      fatherId: grandFather.id,
      motherId: grandMother.id,
    });
    const unrelatedMaleParent = createAnimal("unrelated-male-parent");
    const unrelatedFemaleParent = createAnimal("unrelated-female-parent", {
      sex: Sex.FEMALE,
    });
    const male = createAnimal("male", {
      fatherId: uncle.id,
      motherId: unrelatedFemaleParent.id,
    });
    const female = createAnimal("female", {
      sex: Sex.FEMALE,
      fatherId: unrelatedMaleParent.id,
      motherId: aunt.id,
    });

    const pedigree = new Map<string, Animal>([
      [grandFather.id, grandFather],
      [grandMother.id, grandMother],
      [uncle.id, uncle],
      [aunt.id, aunt],
      [unrelatedMaleParent.id, unrelatedMaleParent],
      [unrelatedFemaleParent.id, unrelatedFemaleParent],
      [male.id, male],
      [female.id, female],
    ]);

    const result = engine.calculateCOI(male, female, pedigree);

    expect(result.coi).toBeCloseTo(0.0625, 8);
    expect(result.riskLevel).toBe(RiskLevel.YELLOW);
  });
});

