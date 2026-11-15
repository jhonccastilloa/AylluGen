import type { PrismaClient } from "../../../src/infrastructure/database/prisma/generated/client";
import { AnimalPrismaRepository } from "../../../src/modules/animal/infrastructure/persistence/AnimalPrismaRepository";
import { AnimalEntity } from "@ayllugen/core/animal/domain/entities/AnimalEntity";

describe("Animal persistence boundaries", () => {
  const row = {
    id: "animal",
    userId: "owner",
    code: "A",
    crotal: null,
    speciesId: "species",
    sex: "MALE" as const,
    birthDate: new Date("2020-02-29T00:00:00Z"),
    fatherId: null,
    motherId: null,
    status: "ACTIVE" as const,
    exitDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    clientCreatedAt: new Date(),
    clientUpdatedAt: new Date(),
  };

  test("locks before reading and uses a separate scoped store without mutating the shared client", async () => {
    const events: string[] = [];
    const transaction = {
      $queryRaw: jest.fn(async () => {
        events.push("lock");
        return [{ userId: "owner" }];
      }),
      animal: {
        findFirst: jest.fn(async () => {
          events.push("read");
          return row;
        }),
      },
    };
    const rootRead = jest.fn().mockResolvedValue(null);
    const client = {
      $transaction: jest.fn(async (operation) => operation(transaction)),
      animal: { findFirst: rootRead },
    };
    const repo = new AnimalPrismaRepository(client as unknown as PrismaClient);
    await repo.withOwnerTransaction("owner", async (store) => {
      const animal = await store.findById("owner", "animal");
      expect(animal?.birthDate).toBe("2020-02-29");
    });
    expect(events).toEqual(["lock", "read"]);
    expect(rootRead).not.toHaveBeenCalled();
    await repo.findById("other", "animal");
    expect(rootRead).toHaveBeenCalledWith({
      where: { userId: "other", id: "animal" },
    });
  });

  test("delegates filtering, stable ordering, count and pagination to the database", async () => {
    const findMany = jest.fn().mockResolvedValue([row]);
    const count = jest.fn().mockResolvedValue(5);
    const repo = new AnimalPrismaRepository({
      animal: { findMany, count },
    } as unknown as PrismaClient);
    const result = await repo.list("owner", {
      sex: "MALE",
      status: "ACTIVE",
      search: "A_%",
      parentId: "parent",
      limit: 2,
      offset: 3,
    });
    const call = findMany.mock.calls[0][0];
    expect(call).toMatchObject({
      where: { userId: "owner", sex: "MALE", status: "ACTIVE" },
      orderBy: [{ code: "asc" }, { id: "asc" }],
      take: 2,
      skip: 3,
    });
    expect(call.where.AND).toContainEqual({
      OR: [{ fatherId: "parent" }, { motherId: "parent" }],
    });
    expect(call.where.AND[1].OR[0].code.contains).toBe("A\\_\\%");
    expect(count).toHaveBeenCalledWith({ where: call.where });
    expect(result.total).toBe(5);
    expect(result.animals[0].birthDate).toBe("2020-02-29");
  });

  test.each([
    "fatherOf",
    "motherOf",
    "healthRecords",
    "productionRecords",
    "breedings",
    "maleBreedings",
    "femaleBreedings",
  ])("detects the %s reference category", async (relation) => {
    const findFirst = jest
      .fn()
      .mockResolvedValue({ _count: { [relation]: 1 } });
    const repo = new AnimalPrismaRepository({
      animal: { findFirst },
    } as unknown as PrismaClient);
    expect(await repo.hasReferences("owner", "animal")).toBe(true);
    expect(findFirst.mock.calls[0][0].where).toEqual({
      id: "animal",
      userId: "owner",
    });
  });

  test("maps only business fields and scopes update/delete by owner", async () => {
    const update = jest.fn().mockResolvedValue(row);
    const remove = jest.fn().mockResolvedValue(row);
    const repo = new AnimalPrismaRepository({
      animal: { update, delete: remove },
    } as unknown as PrismaClient);
    const animal = AnimalEntity.restore({ ...row, birthDate: "2020-02-29" });
    await repo.update(animal);
    const call = update.mock.calls[0][0];
    expect(call.where).toEqual({ id: "animal", userId: "owner" });
    expect(call.data.birthDate).toEqual(new Date("2020-02-29T00:00:00Z"));
    expect(call.data).not.toHaveProperty("isFounder");
    expect(call.data).not.toHaveProperty("userId");
    expect(call.data).not.toHaveProperty("deletedAt");
    await repo.delete("owner", "animal");
    expect(remove).toHaveBeenCalledWith({
      where: { id: "animal", userId: "owner" },
    });
  });
});
