import { SpecieEntity } from "@ayllugen/core/species/domain/entities/SpecieEntity";
import { DeleteSpecieUseCase } from "@ayllugen/core/species/application/use-cases/DeleteSpecieUseCase";
import type { PrismaTransaction } from "../../../src/infrastructure/database/prisma/client";
import { SpeciePrismaRepository } from "../../../src/modules/specie/infrastructure/persistence/SpeciePrismaRepository";

describe("Species physical deletion", () => {
  const row = {
    id: "specie",
    userId: "owner",
    name: "Alpaca",
    description: null,
  };

  test("blocks deletion when only a soft-deleted animal still references the species", async () => {
    const animals = [
      { userId: "owner", speciesId: "specie", deletedAt: new Date() },
    ];
    const count = jest.fn(
      async ({ where }) =>
        animals.filter(
          (animal) =>
            animal.userId === where.userId &&
            animal.speciesId === where.speciesId &&
            (where.deletedAt === undefined ||
              animal.deletedAt === where.deletedAt),
        ).length,
    );
    const remove = jest.fn();
    const repository = new SpeciePrismaRepository({
      species: { findFirst: jest.fn().mockResolvedValue(row), delete: remove },
      animal: { count },
    } as unknown as PrismaTransaction);

    await expect(
      new DeleteSpecieUseCase(repository).execute("owner", "specie"),
    ).rejects.toMatchObject({ code: "SPECIE_IN_USE" });
    expect(remove).not.toHaveBeenCalled();
  });

  test("physically deletes an unused species with an ownership filter", async () => {
    const remove = jest.fn().mockResolvedValue(row);
    const update = jest.fn();
    const repository = new SpeciePrismaRepository({
      species: {
        findFirst: jest.fn().mockResolvedValue(row),
        delete: remove,
        update,
      },
      animal: { count: jest.fn().mockResolvedValue(0) },
    } as unknown as PrismaTransaction);

    await new DeleteSpecieUseCase(repository).execute("owner", "specie");
    expect(remove).toHaveBeenCalledWith({
      where: { id: "specie", userId: "owner" },
    });
    expect(update).not.toHaveBeenCalled();
  });

  test("does not add soft-delete filters to species reads or writes", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const findFirst = jest.fn().mockResolvedValue(row);
    const update = jest.fn().mockResolvedValue(row);
    const repository = new SpeciePrismaRepository({
      species: { findMany, findFirst, update },
    } as unknown as PrismaTransaction);
    await repository.list("owner");
    await repository.findById("owner", "specie");
    await repository.update(SpecieEntity.restore(row));
    expect(findMany).toHaveBeenCalledWith({
      where: { userId: "owner" },
      orderBy: { name: "asc" },
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: { userId: "owner", id: "specie" },
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "owner", id: "specie" } }),
    );
  });
});
