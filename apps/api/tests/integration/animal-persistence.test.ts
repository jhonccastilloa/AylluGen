import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/infrastructure/database/prisma/generated/client";
import { AnimalPrismaRepository } from "../../src/modules/animal/infrastructure/persistence/AnimalPrismaRepository";
import {
  CreateAnimalUseCase,
  UpdateAnimalUseCase,
  DeleteAnimalUseCase,
} from "@ayllugen/core/animal/application/use-cases/index";
import type { ICreateAnimalInput } from "@ayllugen/core/animal/application/use-cases/CreateAnimalUseCase";

const connectionString = process.env.ANIMAL_TEST_DATABASE_URL;
const integration = connectionString ? describe : describe.skip;

integration(
  "Animal PostgreSQL migrations, relationships and transactions",
  () => {
    const schema = `animal_test_${randomUUID().replaceAll("-", "")}`;
    let pool: Pool;
    let db: PrismaClient;
    let repo: AnimalPrismaRepository;
    let create: CreateAnimalUseCase;
    let update: UpdateAnimalUseCase;
    let remove: DeleteAnimalUseCase;
    const legacyOwner = randomUUID();
    const legacySpecies = randomUUID();
    const legacyAnimal = randomUUID();
    const legacyDeleted = randomUUID();
    let nextDni = 20000000;

    beforeAll(async () => {
      const options = {
        connectionString,
        connectionTimeoutMillis: 5000,
        options: `-c search_path=${schema} -c statement_timeout=15000`,
      };
      pool = new Pool(options);
      await pool.query(`CREATE SCHEMA "${schema}"`);
      const client = await pool.connect();
      try {
        const root = path.resolve(__dirname, "../../prisma/migrations");
        const dirs = (await readdir(root, { withFileTypes: true }))
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
          .sort();
        for (const dir of dirs) {
          if (dir === "20261110000000_animal_lifecycle") {
            await client.query(
              "INSERT INTO users(id,dni,password,\"updatedAt\") VALUES ($1,'19999999','hash',now())",
              [legacyOwner],
            );
            await client.query(
              'INSERT INTO species(id,name,"userId","updatedAt") VALUES ($1,\'Alpaca\',$2,now())',
              [legacySpecies, legacyOwner],
            );
            await client.query(
              'INSERT INTO animals(id,crotal,sex,"speciesId","userId","birthDate","updatedAt") VALUES ($1,\' tag-1 \',\'MALE\',$2,$3,\'2020-02-29 12:30:00\',now())',
              [legacyAnimal, legacySpecies, legacyOwner],
            );
            await client.query(
              'INSERT INTO animals(id,crotal,sex,"speciesId","userId","updatedAt","deletedAt") VALUES ($1,\'OLD\',\'MALE\',$2,$3,now(),now())',
              [legacyDeleted, legacySpecies, legacyOwner],
            );
          }
          await client.query(
            await readFile(path.join(root, dir, "migration.sql"), "utf8"),
          );
        }
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      db = new PrismaClient({ adapter: new PrismaPg(options, { schema }) });
      repo = new AnimalPrismaRepository(db);
      create = new CreateAnimalUseCase(repo, { generate: randomUUID });
      update = new UpdateAnimalUseCase(repo);
      remove = new DeleteAnimalUseCase(repo);
    }, 60000);

    afterAll(async () => {
      await db?.$disconnect();
      if (pool) {
        try {
          await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        } finally {
          await pool.end();
        }
      }
    });

    const account = async () => {
      const user = await db.user.create({
        data: { dni: String(nextDni++), password: "hash" },
      });
      const species = await db.species.create({
        data: { name: "Alpaca", userId: user.id },
      });
      return { userId: user.id, speciesId: species.id };
    };
    const animal = (
      owner: { userId: string; speciesId: string },
      changes: Partial<ICreateAnimalInput> = {},
    ) =>
      create.execute({ ...owner, code: randomUUID(), sex: "MALE", ...changes });

    test("migrates existing identities, date-only values and technical snapshots", async () => {
      const restored = await repo.findById(legacyOwner, legacyAnimal);
      expect(restored).toMatchObject({
        code: "TAG-1",
        crotal: "TAG-1",
        birthDate: "2020-02-29",
        status: "ACTIVE",
        isFounder: true,
      });
      expect(await repo.findById(legacyOwner, legacyDeleted)).toBeNull();
      const snapshot = await db.syncRecord.findUniqueOrThrow({
        where: {
          tableName_recordId: { tableName: "animals", recordId: legacyAnimal },
        },
      });
      expect(snapshot.data).toMatchObject({ code: "TAG-1", status: "ACTIVE" });
      expect(snapshot.data).not.toHaveProperty("isFounder");
      expect(snapshot.data).not.toHaveProperty("deletedAt");
      expect(
        (
          await db.syncRecord.findUniqueOrThrow({
            where: {
              tableName_recordId: {
                tableName: "animals",
                recordId: legacyDeleted,
              },
            },
          })
        ).deleted,
      ).toBe(true);
    });

    test("serializes duplicate creation and allows null crotals and another owner's identifiers", async () => {
      const owner = await account();
      const results = await Promise.allSettled([
        animal(owner, { code: " a " }),
        animal(owner, { code: "A" }),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(results.find((r) => r.status === "rejected")).toMatchObject({
        reason: { code: "ANIMAL_DUPLICATE_CODE" },
      });
      await animal(owner, { code: "B" });
      await animal(await account(), { code: "A" });
      await expect(
        db.animal.create({ data: { ...owner, code: "A", sex: "MALE" } }),
      ).rejects.toMatchObject({ code: "P2002" });
      const tagged = await animal(owner, { crotal: "TAG", status: "SOLD" });
      await expect(
        db.animal.create({
          data: { ...owner, code: "C", crotal: tagged.crotal, sex: "MALE" },
        }),
      ).rejects.toMatchObject({ code: "P2002" });
    });

    test("prevents concurrent reciprocal parent links and lost unrelated updates", async () => {
      const owner = await account();
      const first = await animal(owner);
      const second = await animal(owner);
      const results = await Promise.allSettled([
        update.execute({
          userId: owner.userId,
          id: first.id,
          fatherId: second.id,
        }),
        update.execute({
          userId: owner.userId,
          id: second.id,
          fatherId: first.id,
        }),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(results.find((r) => r.status === "rejected")).toMatchObject({
        reason: { code: "ANIMAL_LINEAGE_CYCLE" },
      });
      await Promise.all([
        update.execute({ userId: owner.userId, id: first.id, crotal: "TAG" }),
        update.execute({
          userId: owner.userId,
          id: first.id,
          birthDate: "2000-01-01",
        }),
      ]);
      expect(await repo.findById(owner.userId, first.id)).toMatchObject({
        crotal: "TAG",
        birthDate: "2000-01-01",
      });
    });

    test.each([
      "father",
      "mother",
      "health",
      "production",
      "male",
      "female",
      "offspring",
    ])(
      "restricts physical deletion and corrections for %s references without cascading",
      async (kind) => {
        const owner = await account();
        const target = await animal(owner, {
          sex: ["mother", "female"].includes(kind) ? "FEMALE" : "MALE",
        });
        if (kind === "father" || kind === "mother") {
          await animal(
            owner,
            kind === "father"
              ? { fatherId: target.id }
              : { motherId: target.id },
          );
        } else if (kind === "health") {
          await db.healthRecord.create({
            data: {
              userId: owner.userId,
              animalId: target.id,
              type: "CHECKUP",
              date: new Date(),
            },
          });
        } else if (kind === "production") {
          await db.productionRecord.create({
            data: {
              userId: owner.userId,
              animalId: target.id,
              type: "WEIGHT",
              date: new Date(),
              value: 10,
              unit: "kg",
            },
          });
        } else {
          const male = kind === "male" ? target : await animal(owner);
          const female =
            kind === "female" ? target : await animal(owner, { sex: "FEMALE" });
          await db.breeding.create({
            data: {
              userId: owner.userId,
              maleId: male.id,
              femaleId: female.id,
              offspringId: kind === "offspring" ? target.id : null,
              projectedCOI: 0,
              riskLevel: "GREEN",
            },
          });
        }
        await expect(
          remove.execute(owner.userId, target.id),
        ).rejects.toMatchObject({ code: "ANIMAL_IN_USE" });
        await expect(
          update.execute({
            userId: owner.userId,
            id: target.id,
            sex: target.sex === "MALE" ? "FEMALE" : "MALE",
          }),
        ).rejects.toMatchObject({ code: "ANIMAL_IN_USE" });
        await expect(
          db.animal.delete({ where: { id: target.id } }),
        ).rejects.toMatchObject({ code: "P2003" });
        expect(await repo.hasReferences(owner.userId, target.id)).toBe(true);
        expect(await repo.findById(owner.userId, target.id)).not.toBeNull();
      },
    );

    test("enforces ownership and cycles even for direct SQL writes", async () => {
      const owner = await account();
      const foreign = await animal(await account());
      await expect(
        db.animal.create({
          data: {
            ...owner,
            code: "FOREIGN",
            sex: "MALE",
            fatherId: foreign.id,
          },
        }),
      ).rejects.toBeDefined();
      const first = await animal(owner);
      const second = await animal(owner, { fatherId: first.id });
      await expect(
        db.animal.update({
          where: { id: first.id },
          data: { fatherId: second.id },
        }),
      ).rejects.toBeDefined();
      expect(
        (await repo.findById(owner.userId, first.id))?.fatherId,
      ).toBeNull();
    });

    test("rolls back writes and sync snapshots together and records physical tombstones", async () => {
      const owner = await account();
      const target = await animal(owner, { code: "FREE" });
      await expect(
        repo.withOwnerTransaction(owner.userId, async (store) => {
          await store.delete(owner.userId, target.id);
          throw new Error("rollback");
        }),
      ).rejects.toThrow("rollback");
      expect(await repo.findById(owner.userId, target.id)).not.toBeNull();
      await remove.execute(owner.userId, target.id);
      const snapshot = await db.syncRecord.findUniqueOrThrow({
        where: {
          tableName_recordId: { tableName: "animals", recordId: target.id },
        },
      });
      expect(snapshot).toMatchObject({ deleted: true, data: null });
      expect((await animal(owner, { code: "FREE" })).id).not.toBe(target.id);
    });

    test("filters literally and pages in the database with preserved calendar dates", async () => {
      const owner = await account();
      const first = await animal(owner, {
        code: "A_1",
        birthDate: "2020-02-29",
      });
      await animal(owner, { code: "AB1" });
      await animal(owner, {
        code: "SOLD",
        status: "SOLD",
        exitDate: "2021-01-01",
      });
      const found = await repo.list(owner.userId, {
        search: "_",
        limit: 10,
        offset: 0,
      });
      expect(found.animals.map((a) => a.id)).toEqual([first.id]);
      expect(found.animals[0].birthDate).toBe("2020-02-29");
      const page = await repo.list(owner.userId, {
        status: "ACTIVE",
        limit: 1,
        offset: 1,
      });
      expect(page.total).toBe(2);
      expect(page.animals).toHaveLength(1);
    });
  },
);
