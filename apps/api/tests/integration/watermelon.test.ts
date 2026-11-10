import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import type { Server } from "node:http";
import App from "../../src/server";
import { JwtTokenService } from "../../src/modules/auth/infrastructure/security/JwtTokenService";
import { config } from "../../src/shared/constants/config";
import { prisma } from "../../src/infrastructure/database/prisma/client";
import { WatermelonRepository } from "../../src/modules/sync/infrastructure/repositories/WatermelonRepository";
import { WatermelonService } from "../../src/modules/sync/application/services/WatermelonService";
import {
  watermelonPullSchema,
  watermelonPushSchema,
} from "../../src/modules/sync/application/schemas/watermelon.schema";
import {
  Changes,
  SYNC_TABLES,
  RawRecord,
  SyncTable,
} from "../../src/modules/sync/domain/entities/Watermelon";
import {
  IWatermelonRepository,
  SyncSession,
} from "../../src/modules/sync/domain/repositories/IWatermelonRepository";

jest.unmock("../../src/infrastructure/database/prisma/client");
jest.mock("../../src/infrastructure/logging/logger", () => {
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn(),
  };
  logger.child.mockReturnValue(logger);
  return { logger };
});

const enabled = Boolean(process.env.SYNC_TEST_DATABASE_URL);
const tokens = new JwtTokenService(config);
const suite = enabled ? describe : describe.skip;
suite("Native Watermelon sync / real PostgreSQL", () => {
  const repository = new WatermelonRepository();
  const service = new WatermelonService(repository);
  const users: string[] = [];
  let userId: string;
  let server: Server;
  let baseUrl: string;
  const species = (): RawRecord => ({
    id: randomUUID(),
    code: "ALPACA",
    name: "Alpaca",
    description: null,
    created_at: 1700000000000,
    updated_at: 1700000060000,
  });
  const animal = (
    speciesId: string,
    extra: Partial<RawRecord> = {},
  ): RawRecord =>
    ({
      id: randomUUID(),
      crotal: randomUUID(),
      sex: "FEMALE",
      species_id: speciesId,
      birth_date: null,
      is_founder: true,
      father_id: null,
      mother_id: null,
      created_at: 1700000000000,
      updated_at: 1700000060000,
      ...extra,
    }) as RawRecord;
  const health = (animalId: string): RawRecord => ({
    id: randomUUID(),
    animal_id: animalId,
    type: "CHECKUP",
    date: 1700000000000,
    notes: null,
    next_due_date: null,
    completed: true,
    created_at: 1700000000000,
    updated_at: 1700000060000,
  });
  const change = (
    created: RawRecord[] = [],
    updated: RawRecord[] = [],
    deleted: string[] = [],
  ) => ({ created, updated, deleted });
  const pull = (since: number | null = null, owner = userId) =>
    service.pull(
      owner,
      watermelonPullSchema.parse({ lastPulledAt: since, schemaVersion: 7 }),
    );
  const push = (changes: Partial<Changes>, since: number, owner = userId) =>
    service.push(
      owner,
      watermelonPushSchema.parse({ lastPulledAt: since, changes }),
    );
  const newUser = async () => {
    const id = randomUUID();
    users.push(id);
    await prisma.user.create({ data: { id, dni: id, password: "test-only" } });
    return id;
  };
  const seed = async () => {
    const s = species();
    const a = animal(s.id);
    const h = health(a.id);
    await push(
      {
        species: change([s]),
        animals: change([a]),
        health_records: change([h]),
      },
      (await pull()).timestamp,
    );
    return { s, a, h, checkpoint: (await pull()).timestamp };
  };
  beforeAll(async () => {
    const url = new URL(process.env.SYNC_TEST_DATABASE_URL!);
    if (
      !["localhost", "127.0.0.1"].includes(url.hostname) ||
      url.pathname !== "/sync_test"
    )
      throw new Error("Use an isolated local database named sync_test");
    await new Promise<void>((resolve, reject) => {
      server = new App()
        .getApp()
        .listen(0, "127.0.0.1", (error) => (error ? reject(error) : resolve()));
    });
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Missing test port");
    baseUrl = `http://127.0.0.1:${address.port}/api`;
  });
  beforeEach(async () => {
    userId = await newUser();
  });
  afterAll(async () => {
    // Only users created by this test run are removed, never a database/schema reset.
    try {
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    } finally {
      await prisma.$disconnect();
      if (server)
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
    }
  });

  it("first pull of an empty account has a positive checkpoint and five empty collections", async () => {
    const result = await pull();
    expect(result.timestamp).toBe(1);
    expect(Object.keys(result.changes)).toHaveLength(5);
    expect(
      Object.values(result.changes).every(
        (c) => !c.created.length && !c.updated.length && !c.deleted.length,
      ),
    ).toBe(true);
  });
  it("Species REST uses the shared commands and round-trips their origin dates through sync", async () => {
    const headers = {
      "content-type": "application/json",
      authorization: `Bearer ${tokens.issue({ userId, dni: "test" }).accessToken}`,
    };
    const created = await fetch(`${baseUrl}/species`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        code: " alpaca ",
        name: " Alpaca ",
        description: " Andina ",
      }),
    });
    expect(created.status).toBe(201);
    const first = (await created.json()) as {
      id: string;
      code: string;
      clientCreatedAt: string;
      createdAt: string;
    };
    expect(first.code).toBe("ALPACA");
    const updated = await fetch(`${baseUrl}/species/${first.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ description: "" }),
    });
    expect(updated.status).toBe(200);
    const second = (await updated.json()) as {
      description: string | null;
      clientCreatedAt: string;
      clientUpdatedAt: string;
      createdAt: string;
    };
    expect(second.description).toBeNull();
    expect(second.clientCreatedAt).toBe(first.clientCreatedAt);
    expect(second.createdAt).toBe(first.createdAt);
    const result = await pull();
    const raw = result.changes.species.created.find(
      (row) => row.id === first.id,
    )!;
    expect(raw.created_at).toBe(Date.parse(first.clientCreatedAt));
    expect(raw.updated_at).toBe(Date.parse(second.clientUpdatedAt));
    const duplicates = await Promise.all(
      [1, 2].map(() =>
        fetch(`${baseUrl}/species`, {
          method: "POST",
          headers,
          body: JSON.stringify({ code: "LLAMA", name: "Llama" }),
        }),
      ),
    );
    expect(duplicates.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
  });

  it("Species deletion shares the rule for REST and final-state sync batches", async () => {
    const { s, a, h, checkpoint } = await seed();
    const headers = {
      authorization: `Bearer ${tokens.issue({ userId, dni: "test" }).accessToken}`,
    };
    const denied = await fetch(`${baseUrl}/species/${s.id}`, {
      method: "DELETE",
      headers,
    });
    expect(denied.status).toBe(400);
    await expect(
      push({ species: change([], [], [s.id]) }, checkpoint),
    ).rejects.toThrow();
    // Removing the animal in the same batch makes the final catalog state valid.
    await push(
      {
        species: change([], [], [s.id]),
        animals: change([], [], [a.id]),
        health_records: change([], [], [h.id]),
      },
      checkpoint,
    );
    expect((await pull(checkpoint)).changes.species.deleted).toContain(s.id);
    const reserved = await fetch(`${baseUrl}/species`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ code: "ALPACA", name: "Alpaca" }),
    });
    expect(reserved.status).toBe(409);
  });
  it.each(SYNC_TABLES)(
    "%s round-trips device dates independently of server audit, retries and clock skew",
    async (table) => {
      const createdAt = Date.parse("2026-09-01T10:00:00.123Z");
      const updatedAt = createdAt + 2 * 86400000;
      const dates = { created_at: createdAt, updated_at: updatedAt };
      const kind = { ...species(), ...dates };
      const male = animal(kind.id, { sex: "MALE", ...dates });
      const female = animal(kind.id, dates);
      const records: Record<SyncTable, RawRecord> = {
        species: kind,
        animals: male,
        breedings: {
          id: randomUUID(),
          male_id: male.id,
          female_id: female.id,
          projected_coi: 0,
          risk_level: "GREEN",
          offspring_id: null,
          breeding_date: 1600000000000,
          notes: null,
          ...dates,
        },
        health_records: { ...health(male.id), ...dates },
        production_records: {
          id: randomUUID(),
          animal_id: male.id,
          type: "WEIGHT",
          date: 1600000000000,
          value: 50,
          unit: "kg",
          quality_score: null,
          notes: null,
          ...dates,
        },
      };
      const changes = Object.fromEntries(
        SYNC_TABLES.map((t) => [t, change([records[t]])]),
      );
      changes.animals.created.push(female);
      await push(changes, 1);
      const firstPull = await pull();
      const original = records[table];
      expect(
        firstPull.changes[table].created.find((r) => r.id === original.id),
      ).toEqual(original);
      const read = async () =>
        (
          await prisma.$queryRawUnsafe<
            {
              clientCreatedAt: Date;
              clientUpdatedAt: Date;
              createdAt: Date;
              updatedAt: Date;
            }[]
          >(`SELECT * FROM "${table}" WHERE id = $1`, original.id)
        )[0];
      const firstRow = await read();
      expect(firstRow.clientCreatedAt.getTime()).toBe(createdAt);
      expect(firstRow.clientUpdatedAt.getTime()).toBe(updatedAt);
      expect(firstRow.createdAt.getTime()).toBeGreaterThan(updatedAt);
      expect(firstRow).not.toHaveProperty("syncStatus");
      expect(firstRow).not.toHaveProperty("syncVersion");
      // A lost response must not restamp dates or move the checkpoint when retried.
      await push(changes, 1);
      expect(await read()).toEqual(firstRow);
      expect((await pull()).timestamp).toBe(firstPull.timestamp);
      const columns: Record<SyncTable, string> = {
        species: "name",
        animals: "crotal",
        breedings: "notes",
        health_records: "notes",
        production_records: "notes",
      };
      const edited = {
        ...original,
        [columns[table]]: "Edited",
        created_at: createdAt + 1,
        updated_at: 0,
      };
      await push({ [table]: change([], [edited]) }, firstPull.timestamp);
      const delta = await pull(firstPull.timestamp);
      expect(delta.changes[table].updated).toEqual([
        { ...edited, created_at: createdAt },
      ]);
      expect(delta.timestamp).toBeGreaterThan(firstPull.timestamp);
      const row = await read();
      expect(row.clientCreatedAt).toEqual(firstRow.clientCreatedAt);
      expect(row.clientUpdatedAt.getTime()).toBe(0);
      expect(row.createdAt).toEqual(firstRow.createdAt);
      expect(row.updatedAt.getTime()).toBeGreaterThan(
        firstRow.updatedAt.getTime(),
      );
      expect(
        (await pull()).changes[table].created.find((r) => r.id === original.id),
      ).toEqual({ ...edited, created_at: createdAt });
      expect((await pull(delta.timestamp)).changes[table]).toEqual(change());
      for (const field of ["created_at", "updated_at"]) {
        const missing = { ...original };
        delete missing[field];
        expect(
          watermelonPushSchema.safeParse({
            lastPulledAt: 1,
            changes: { [table]: change([missing]) },
          }).success,
        ).toBe(false);
      }
      for (const field of [
        "client_created_at",
        "client_updated_at",
        "sync_status",
        "sync_version",
        "createdAt",
        "updatedAt",
      ]) {
        expect(
          watermelonPushSchema.safeParse({
            lastPulledAt: 1,
            changes: { [table]: change([{ ...original, [field]: 1 }]) },
          }).success,
        ).toBe(false);
      }
    },
  );
  it("first pull returns only the owned initial dataset", async () => {
    const { s, a, h } = await seed();
    const result = await pull(0);
    expect(result.changes.species.created[0].id).toBe(s.id);
    expect(result.changes.animals.created[0].id).toBe(a.id);
    expect(result.changes.health_records.created[0].id).toBe(h.id);
    expect(result.changes.animals.created[0]).not.toHaveProperty("userId");
  });
  it("pull with no changes stays empty", async () => {
    const { checkpoint } = await seed();
    const result = await pull(checkpoint);
    expect(result.changes.animals).toEqual(change());
    expect(result.timestamp).toBe(checkpoint);
  });
  it("push created and incremental pull preserve client IDs", async () => {
    const since = (await pull()).timestamp;
    const s = species();
    await push({ species: change([s]) }, since);
    expect((await pull(since)).changes.species.created[0]).toMatchObject(s);
  });
  it("push updated is exposed as updated", async () => {
    const { s, checkpoint } = await seed();
    await push(
      { species: change([], [{ ...s, name: "Updated" }]) },
      checkpoint,
    );
    expect((await pull(checkpoint)).changes.species.updated[0].name).toBe(
      "Updated",
    );
  });
  it("push deleted keeps a tombstone for physical deletions", async () => {
    const { h, checkpoint } = await seed();
    await push({ health_records: change([], [], [h.id]) }, checkpoint);
    expect((await pull(checkpoint)).changes.health_records.deleted).toEqual([
      h.id,
    ]);
    expect(
      await prisma.healthRecord.findUnique({ where: { id: h.id } }),
    ).toBeNull();
  });
  it("multi-table push is a single transaction with batch parent references", async () => {
    const s = species();
    const father = animal(s.id, { sex: "MALE" });
    const child = animal(s.id, { father_id: father.id });
    await push(
      {
        animals: change([child, father]),
        species: change([s]),
        health_records: change([health(child.id)]),
      },
      1,
    );
    expect((await pull()).changes.animals.created).toHaveLength(2);
  });
  it("rolls back earlier table writes, counter and receipt on a unique constraint error", async () => {
    const s = species();
    const first = animal(s.id);
    const second = animal(s.id, { crotal: first.crotal });
    await expect(
      push({ species: change([s]), animals: change([first, second]) }, 1),
    ).rejects.toBeDefined();
    expect((await pull()).timestamp).toBe(1);
    expect((await pull()).changes.species.created).toHaveLength(0);
    expect(await prisma.syncReceipt.count({ where: { userId } })).toBe(0);
  });
  it("rejects the whole push when server state is newer", async () => {
    const { s, h, checkpoint } = await seed();
    await prisma.species.update({
      where: { id: s.id },
      data: { name: "REST edit" },
    });
    await expect(
      push(
        {
          species: change([], [{ ...s, name: "stale" }]),
          health_records: change([], [], [h.id]),
        },
        checkpoint,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(
      await prisma.healthRecord.findUnique({ where: { id: h.id } }),
    ).not.toBeNull();
  });
  it("retries an entire successful push after a lost response without new writes", async () => {
    const s = species();
    const changes = { species: change([s]) };
    await push(changes, 1);
    const checkpoint = (await pull()).timestamp;
    await push(changes, 1);
    expect((await pull()).timestamp).toBe(checkpoint);
  });
  it("an old retry receipt cannot overwrite a later edit", async () => {
    const s = species();
    await push({ species: change([s]) }, 1);
    await prisma.species.update({
      where: { id: s.id },
      data: { name: "newer" },
    });
    await push({ species: change([s]) }, 1);
    expect((await pull()).changes.species.created[0].name).toBe("newer");
  });
  it("created for an existing owned ID updates after a fresh pull", async () => {
    const { s, checkpoint } = await seed();
    await push({ species: change([{ ...s, name: "upsert" }]) }, checkpoint);
    expect((await pull(checkpoint)).changes.species.updated[0].name).toBe(
      "upsert",
    );
  });
  it("an update of an unknown ID creates the record", async () => {
    const s = species();
    await push({ species: change([], [s]) }, 1);
    expect((await pull()).changes.species.created[0].id).toBe(s.id);
  });
  it("rejects another user’s ID for create, update and delete", async () => {
    const { s } = await seed();
    const other = await newUser();
    for (const changes of [
      change([s]),
      change([], [s]),
      change([], [], [s.id]),
    ]) {
      await expect(push({ species: changes }, 1, other)).rejects.toMatchObject({
        statusCode: 403,
      });
    }
  });
  it("user B cannot pull A’s data or tombstones", async () => {
    const { h, checkpoint } = await seed();
    await push({ health_records: change([], [], [h.id]) }, checkpoint);
    const other = await newUser();
    const result = await pull(null, other);
    expect(
      Object.values(result.changes).every(
        (c) => !c.created.length && !c.deleted.length,
      ),
    ).toBe(true);
  });
  it("rejects relationships to another user", async () => {
    const { s } = await seed();
    const other = await newUser();
    await expect(
      push({ animals: change([animal(s.id)]) }, 1, other),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
  it("also protects relationships from legacy/REST writes at database level", async () => {
    const { a } = await seed();
    const other = await newUser();
    await expect(
      prisma.healthRecord.create({
        data: {
          userId: other,
          animalId: a.id,
          type: "CHECKUP",
          date: new Date(),
        },
      }),
    ).rejects.toBeDefined();
    expect(
      (await pull(null, other)).changes.health_records.created,
    ).toHaveLength(0);
  });
  it("ignores deletion of missing and already deleted records", async () => {
    const { h, checkpoint } = await seed();
    await push(
      { health_records: change([], [], [h.id, randomUUID()]) },
      checkpoint,
    );
    await push(
      { health_records: change([], [], [h.id]) },
      (await pull()).timestamp,
    );
  });
  it("never resurrects tombstones through created or updated", async () => {
    const { h, checkpoint } = await seed();
    await push({ health_records: change([], [], [h.id]) }, checkpoint);
    for (const changes of [change([h]), change([], [h])])
      await expect(
        push({ health_records: changes }, (await pull()).timestamp),
      ).rejects.toMatchObject({ statusCode: 409 });
  });
  it("old checkpoints retain all incremental changes and deletions after long offline periods", async () => {
    const { h, checkpoint } = await seed();
    await prisma.healthRecord.update({
      where: { id: h.id },
      data: { clientUpdatedAt: new Date("2000-01-01"), notes: "offline event" },
    });
    expect(
      (await pull(checkpoint)).changes.health_records.updated[0].notes,
    ).toBe("offline event");
    await prisma.healthRecord.delete({ where: { id: h.id } });
    expect((await pull(checkpoint)).changes.health_records.deleted).toEqual([
      h.id,
    ]);
  });
  it("empty push does not advance versions or write receipts", async () => {
    await push({}, 1);
    expect((await pull()).timestamp).toBe(1);
  });
  it("rejects future checkpoints", async () => {
    await expect(pull(9999)).rejects.toMatchObject({ statusCode: 400 });
    await expect(push({}, 9999)).rejects.toMatchObject({ statusCode: 400 });
  });
  it("does not use forged client timestamps for ordering", async () => {
    const s = { ...species(), created_at: 1, updated_at: 1 };
    await push({ species: change([s]) }, 1);
    expect((await pull()).changes.species.created[0].created_at).toBe(1);
    expect((await pull()).timestamp).toBeGreaterThan(1);
  });

  it("round-trips native animal dates through client timestamps, independently of server audit", async () => {
    const s = species();
    const created = Date.parse("2026-09-01T10:00:00.123Z");
    const updated = created + 2 * 86400000;
    const a = animal(s.id, { created_at: created, updated_at: updated });
    const currentPull = (since: number | null = null) =>
      service.pull(
        userId,
        watermelonPullSchema.parse({ lastPulledAt: since, schemaVersion: 7 }),
      );
    await push({ species: change([s]), animals: change([a]) }, 1);
    const first = await currentPull();
    const remote = first.changes.animals.created[0];
    expect(remote).toMatchObject(a);
    expect(remote).not.toHaveProperty("client_created_at");
    expect(remote).not.toHaveProperty("client_updated_at");
    const stored = await prisma.animal.findUniqueOrThrow({
      where: { id: a.id },
    });
    expect(stored.clientCreatedAt.getTime()).toBe(created);
    expect(stored.clientUpdatedAt.getTime()).toBe(updated);
    expect(stored.createdAt.getTime()).not.toBe(created);
    expect(stored.updatedAt.getTime()).not.toBe(updated);
    // A device clock can move backwards. Only the checkpoint determines the delta.
    const nextUpdated = updated - 3600000;
    const edits = {
      animals: change(
        [],
        [
          {
            ...a,
            crotal: "NATIVE EDIT",
            created_at: updated,
            updated_at: nextUpdated,
          },
        ],
      ),
    };
    await push(edits, first.timestamp);
    const afterEdit = await prisma.animal.findUniqueOrThrow({
      where: { id: a.id },
    });
    await push(edits, first.timestamp); // exact retry must not restamp either clock
    expect(
      await prisma.animal.findUniqueOrThrow({ where: { id: a.id } }),
    ).toEqual(afterEdit);
    const second = await currentPull(first.timestamp);
    expect(second.timestamp).toBeGreaterThan(first.timestamp);
    expect(second.changes.animals.updated[0]).toMatchObject({
      created_at: created,
      updated_at: nextUpdated,
    });
    expect(afterEdit.createdAt).toEqual(stored.createdAt);
    expect(afterEdit.updatedAt.getTime()).toBeGreaterThanOrEqual(
      stored.updatedAt.getTime(),
    );
    expect((await currentPull(second.timestamp)).changes.animals).toEqual(
      change(),
    );
    expect((await currentPull()).changes.animals.created[0]).toMatchObject({
      created_at: created,
      updated_at: nextUpdated,
    });
  });

  it("soft deleting an animal emits dependent tombstones and detaches pedigree links", async () => {
    const { s, a, h, checkpoint } = await seed();
    const child = animal(s.id, { mother_id: a.id });
    await push({ animals: change([child]) }, checkpoint);
    const since = (await pull()).timestamp;
    await push({ animals: change([], [], [a.id]) }, since);
    const result = await pull(since);
    expect(result.changes.animals.deleted).toEqual([a.id]);
    expect(result.changes.health_records.deleted).toEqual([h.id]);
    expect(result.changes.animals.updated[0].mother_id).toBeNull();
  });
  it("rejects implicit cascade conflicts", async () => {
    const { a, h, checkpoint } = await seed();
    await prisma.healthRecord.update({
      where: { id: h.id },
      data: { notes: "newer" },
    });
    await expect(
      push({ animals: change([], [], [a.id]) }, checkpoint),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
  it("rejects deleting a species still used by animals", async () => {
    const { s, checkpoint } = await seed();
    await expect(
      push({ species: change([], [], [s.id]) }, checkpoint),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
  it("rejects cyclic parentage in a batch", async () => {
    const s = species();
    const a = animal(s.id, { sex: "MALE" });
    const b = animal(s.id, { sex: "MALE", father_id: a.id });
    a.father_id = b.id;
    await expect(
      push({ species: change([s]), animals: change([a, b]) }, 1),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
  it("conflicting concurrent pushes allow exactly one writer", async () => {
    const { s, checkpoint } = await seed();
    const results = await Promise.allSettled(
      ["one", "two"].map((name) =>
        push({ species: change([], [{ ...s, name }]) }, checkpoint),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  });
  it("a pull during an uncommitted REST write sees a consistent snapshot and the next pull gets it", async () => {
    const { s, checkpoint } = await seed();
    const client = new Client({
      connectionString: process.env.SYNC_TEST_DATABASE_URL,
    });
    await client.connect();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE species SET name = $1 WHERE id = $2", [
        "uncommitted",
        s.id,
      ]);
      const during = await pull(checkpoint);
      expect(during.timestamp).toBe(checkpoint);
      expect(during.changes.species.updated).toHaveLength(0);
      await client.query("COMMIT");
      expect(
        (await pull(during.timestamp)).changes.species.updated[0].name,
      ).toBe("uncommitted");
    } finally {
      await client.query("ROLLBACK");
      await client.end();
    }
  });
  it("pull counter and collections stay in one snapshot even if a writer commits between queries", async () => {
    const { s, checkpoint } = await seed();
    await repository.transaction(userId, "pull", async (session) => {
      expect(await session.checkpoint()).toBe(BigInt(checkpoint));
      await prisma.species.update({
        where: { id: s.id },
        data: { name: "between queries" },
      });
      expect(await session.changesSince(BigInt(checkpoint))).toHaveLength(0);
    });
    expect((await pull(checkpoint)).changes.species.updated[0].name).toBe(
      "between queries",
    );
  });
  it("concurrent ID collision across users cannot change the winner’s tracked snapshot", async () => {
    const other = await newUser();
    const s = species();
    const results = await Promise.allSettled([
      push({ species: change([s]) }, 1),
      push({ species: change([{ ...s, name: "Other owner" }]) }, 1, other),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const winner = results[0].status === "fulfilled" ? userId : other;
    const record = await prisma.species.findUniqueOrThrow({
      where: { id: s.id },
    });
    expect(record.userId).toBe(winner);
    expect((await pull(null, winner)).changes.species.created[0].name).toBe(
      record.name,
    );
  });
  it("allows deleting a species with animals deleted in the same batch", async () => {
    const { s, a, checkpoint } = await seed();
    await push(
      { species: change([], [], [s.id]), animals: change([], [], [a.id]) },
      checkpoint,
    );
    const result = await pull(checkpoint);
    expect(result.changes.species.deleted).toEqual([s.id]);
    expect(result.changes.animals.deleted).toEqual([a.id]);
  });
  it("HTTP authenticates, validates, pushes and returns an unwrapped Watermelon response", async () => {
    const token = tokens.issue({ userId, dni: "test" }).accessToken;
    const headers = {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    };
    const call = (path: string, body: unknown, auth = true) =>
      fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: auth ? headers : { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    expect(
      (
        await call(
          "/sync/v2/pull",
          { lastPulledAt: null, schemaVersion: 7 },
          false,
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await call("/sync/v2/pull", {
          lastPulledAt: null,
          schemaVersion: 7,
          userId: randomUUID(),
        })
      ).status,
    ).toBe(400);
    const s = species();
    expect(
      (
        await call("/sync/v2/push", {
          lastPulledAt: 1,
          changes: { species: change([s]) },
        })
      ).status,
    ).toBe(204);
    const result = await call("/sync/v2/pull", {
      lastPulledAt: null,
      schemaVersion: 7,
    });
    expect(result.status).toBe(200);
    expect(
      ((await result.json()) as { changes: Changes }).changes.species.created[0]
        .id,
    ).toBe(s.id);
    const other = await newUser();
    expect((await fetch(`${baseUrl}/users/${other}`, { headers })).status).toBe(
      403,
    );
  });
  it.each(["/sync/pull", "/sync/push", "/sync/resolve-conflict"])(
    "does not expose the old queue endpoint %s",
    async (path) => {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${tokens.issue({ userId, dni: "test" }).accessToken}`,
        },
        body: JSON.stringify({}),
      });
      expect(response.status).toBe(404);
      expect(response.headers.has("deprecation")).toBe(false);
    },
  );
  it("HTTP rejects oversized payloads without logging or applying their contents", async () => {
    const response = await fetch(`${baseUrl}/sync/v2/push`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${tokens.issue({ userId, dni: "test" }).accessToken}`,
      },
      body: JSON.stringify({
        lastPulledAt: 1,
        changes: {},
        oversized: "x".repeat(2 * 1024 * 1024),
      }),
    });
    expect(response.status).toBe(413);
    expect((await pull()).timestamp).toBe(1);
  });
  it("HTTP returns 401 for invalid tokens and 400 for malformed JSON", async () => {
    const invalidToken = await fetch(`${baseUrl}/sync/v2/pull`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer invalid.token",
      },
      body: JSON.stringify({ lastPulledAt: null, schemaVersion: 7 }),
    });
    expect(invalidToken.status).toBe(401);
    const invalidJson = await fetch(`${baseUrl}/sync/v2/push`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ broken",
    });
    expect(invalidJson.status).toBe(400);
  });
  it.each(["breedings", "production_records"] as SyncTable[])(
    "syncs %s through create/update/delete",
    async (table) => {
      const { s, a, checkpoint } = await seed();
      const male = animal(s.id, { sex: "MALE" });
      await push({ animals: change([male]) }, checkpoint);
      const record: RawRecord =
        table === "breedings"
          ? {
              id: randomUUID(),
              male_id: male.id,
              female_id: a.id,
              projected_coi: 0,
              risk_level: "GREEN",
              offspring_id: null,
              breeding_date: null,
              notes: null,
              created_at: 1700000000000,
              updated_at: 1700000060000,
            }
          : {
              id: randomUUID(),
              animal_id: a.id,
              type: "WEIGHT",
              date: 1700000000000,
              value: 15,
              unit: "kg",
              quality_score: null,
              notes: null,
              created_at: 1700000000000,
              updated_at: 1700000060000,
            };
      let since = (await pull()).timestamp;
      await push({ [table]: change([record]) }, since);
      expect((await pull(since)).changes[table].created[0].id).toBe(record.id);
      since = (await pull()).timestamp;
      await push(
        { [table]: change([], [{ ...record, notes: "changed" }]) },
        since,
      );
      expect((await pull(since)).changes[table].updated[0].notes).toBe(
        "changed",
      );
      since = (await pull()).timestamp;
      await push({ [table]: change([], [], [record.id]) }, since);
      expect((await pull(since)).changes[table].deleted).toEqual([record.id]);
    },
  );
});

describe("Watermelon request whitelist", () => {
  it("validates animal device timestamps without accepting legacy row tracking", () => {
    const a = {
      id: randomUUID(),
      crotal: "A",
      sex: "MALE",
      species_id: randomUUID(),
      birth_date: null,
      is_founder: true,
      father_id: null,
      mother_id: null,
      created_at: 1700000000000,
      updated_at: 1700000060000,
    };
    const input = (record: object) => ({
      lastPulledAt: 1,
      changes: {
        animals: { created: [record], updated: [], deleted: [] },
      },
    });
    expect(watermelonPushSchema.safeParse(input(a)).success).toBe(true);
    for (const record of [
      { ...a, created_at: undefined },
      { ...a, updated_at: undefined },
      { ...a, client_created_at: a.created_at },
      { ...a, client_updated_at: a.updated_at },
    ])
      expect(watermelonPushSchema.safeParse(input(record)).success).toBe(false);
    for (const invalid of ["yesterday", null, 1.5, Number.MAX_SAFE_INTEGER])
      expect(
        watermelonPushSchema.safeParse(input({ ...a, updated_at: invalid }))
          .success,
      ).toBe(false);
    expect(
      watermelonPushSchema.safeParse(input({ ...a, syncStatus: "SYNCED" }))
        .success,
    ).toBe(false);
  });
  it.each([
    { lastPulledAt: -1, changes: {} },
    { lastPulledAt: 1.5, changes: {} },
    { lastPulledAt: 1, userId: randomUUID(), changes: {} },
    {
      lastPulledAt: 1,
      changes: { users: { created: [], updated: [], deleted: [] } },
    },
    {
      lastPulledAt: 1,
      changes: {
        species: {
          created: [
            {
              id: randomUUID(),
              code: "AL",
              name: "Alpaca",
              description: null,
              user_id: randomUUID(),
            },
          ],
          updated: [],
          deleted: [],
        },
      },
    },
    {
      lastPulledAt: 1,
      changes: {
        species: {
          created: [],
          updated: [],
          deleted: ["unsafe; DROP TABLE users"],
        },
      },
    },
  ])("rejects invalid request %#", (input) => {
    expect(watermelonPushSchema.safeParse(input).success).toBe(false);
  });
  it("rejects duplicate IDs across operations", () => {
    const id = randomUUID();
    expect(
      watermelonPushSchema.safeParse({
        lastPulledAt: 1,
        changes: { species: { created: [], updated: [], deleted: [id, id] } },
      }).success,
    ).toBe(false);
  });
  it("rejects forbidden migration columns and schema versions", () => {
    for (const schemaVersion of [1, 2, 3, 4, 5, 6, 8])
      expect(
        watermelonPullSchema.safeParse({ lastPulledAt: null, schemaVersion })
          .success,
      ).toBe(false);
    expect(
      watermelonPullSchema.safeParse({ lastPulledAt: null, schemaVersion: 7 })
        .success,
    ).toBe(true);
    expect(
      watermelonPullSchema.safeParse({
        lastPulledAt: 1,
        schemaVersion: 7,
        migration: {
          from: 3,
          tables: [],
          columns: [{ table: "species", columns: ["userId"] }],
        },
      }).success,
    ).toBe(false);
    expect(
      watermelonPullSchema.safeParse({ lastPulledAt: null, schemaVersion: 3 })
        .success,
    ).toBe(false);
  });
  it("rejects batches above 500 operations", () => {
    expect(
      watermelonPushSchema.safeParse({
        lastPulledAt: 1,
        changes: {
          species: {
            created: [],
            updated: [],
            deleted: Array.from({ length: 501 }, () => randomUUID()),
          },
        },
      }).success,
    ).toBe(false);
  });
});

suite("Watermelon migrations on persisted legacy rows", () => {
  let client: Client;
  let schema: string;
  beforeEach(async () => {
    const url = new URL(process.env.SYNC_TEST_DATABASE_URL!);
    if (
      !["localhost", "127.0.0.1"].includes(url.hostname) ||
      url.pathname !== "/sync_test"
    )
      throw new Error("Expected isolated sync_test database");
    client = new Client({ connectionString: url.toString() });
    await client.connect();
    schema = `sync_migration_${randomUUID().replace(/-/g, "")}`;
    if (!/^sync_migration_[a-f0-9]{32}$/.test(schema))
      throw new Error("Invalid test schema");
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    const root = join(__dirname, "../../prisma/migrations");
    for (const name of readdirSync(root)
      .filter((name) => /^\d/.test(name) && name < "20260905010000")
      .sort()) {
      await client.query(
        readFileSync(join(root, name, "migration.sql"), "utf8"),
      );
    }
  });
  afterEach(async () => {
    await client.query("ROLLBACK");
    // This exact, validated schema was created by this test, not an application schema.
    if (!/^sync_migration_[a-f0-9]{32}$/.test(schema))
      throw new Error("Invalid cleanup target");
    await client.query(`DROP SCHEMA "${schema}" CASCADE`);
    await client.end();
  });
  const migrate = async (name: string) =>
    client.query(
      readFileSync(
        join(__dirname, "../../prisma/migrations", name, "migration.sql"),
        "utf8",
      ),
    );
  it("unifies persisted snapshots without resetting counters, receipts or tombstones", async () => {
    const owner = randomUUID();
    const kind = randomUUID();
    const male = randomUUID();
    const female = randomUUID();
    await client.query(
      "INSERT INTO users (id,dni,password,\"updatedAt\") VALUES ($1,$1,'test',now())",
      [owner],
    );
    await client.query(
      "INSERT INTO species (id,code,name,\"userId\",\"updatedAt\") VALUES ($1,'ALPACA','Alpaca',$2,now())",
      [kind, owner],
    );
    await client.query(
      "INSERT INTO animals (id,crotal,sex,\"speciesId\",\"userId\",\"updatedAt\") VALUES ($1,'M','MALE',$3,$4,now()),($2,'F','FEMALE',$3,$4,now())",
      [male, female, kind, owner],
    );
    await client.query(
      'INSERT INTO breedings (id,"maleId","femaleId","projectedCOI","riskLevel","userId","updatedAt") VALUES ($1,$2,$3,0,\'GREEN\',$4,now())',
      [randomUUID(), male, female, owner],
    );
    await client.query(
      'INSERT INTO health_records (id,"animalId",type,date,"userId","updatedAt") VALUES ($1,$2,\'CHECKUP\',now(),$3,now())',
      [randomUUID(), male, owner],
    );
    const production = randomUUID();
    await client.query(
      'INSERT INTO production_records (id,"animalId",type,date,value,unit,"userId","updatedAt") VALUES ($1,$2,\'WEIGHT\',now(),50,\'kg\',$3,now())',
      [production, male, owner],
    );
    for (const name of [
      "20260905010000_watermelon_sync",
      "20260905020000_sync_ownership",
      "20260908000000_animal_device_dates",
      "20260909000000_remove_legacy_sync",
    ])
      await migrate(name);
    await client.query("DELETE FROM production_records WHERE id=$1", [
      production,
    ]);
    await client.query(
      "INSERT INTO sync_receipts (\"userId\",hash) VALUES ($1,'confirmed')",
      [owner],
    );
    const snapshotQuery =
      'SELECT * FROM sync_records ORDER BY "tableName", "recordId"';
    const before = (await client.query(snapshotQuery)).rows;
    const clocks = (await client.query("SELECT * FROM sync_clocks")).rows;
    const receipts = (await client.query("SELECT * FROM sync_receipts")).rows;
    await migrate("20260910000000_unify_device_timestamps");
    const after = (await client.query(snapshotQuery)).rows;
    for (const [index, row] of after.entries()) {
      expect({ ...row, data: null }).toEqual({ ...before[index], data: null });
      if (row.data) {
        const {
          syncStatus: _status,
          syncVersion: _version,
          ...data
        } = before[index].data;
        expect(row.data).toMatchObject(data);
        expect(row.data).not.toHaveProperty("syncStatus");
        expect(row.data).not.toHaveProperty("syncVersion");
        expect(row.data.clientCreatedAt).toBeDefined();
        expect(row.data.clientUpdatedAt).toBeDefined();
      } else expect(row.recordId).toBe(production);
    }
    expect((await client.query("SELECT * FROM sync_clocks")).rows).toEqual(
      clocks,
    );
    expect((await client.query("SELECT * FROM sync_receipts")).rows).toEqual(
      receipts,
    );
    expect(
      (
        await client.query(
          'SELECT data FROM sync_records WHERE "recordId"=$1',
          [kind],
        )
      ).rows[0].data,
    ).toEqual(
      (
        await client.query(
          "SELECT to_jsonb(s) AS data FROM species s WHERE id=$1",
          [kind],
        )
      ).rows[0].data,
    );
    expect(
      (
        await client.query(
          "SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND column_name IN ('syncStatus','syncVersion')",
          [schema],
        )
      ).rows,
    ).toHaveLength(0);
  });
  it("backfills versions and tombstones without changing IDs or original business rows", async () => {
    const owner = randomUUID();
    const speciesId = randomUUID();
    const animalId = randomUUID();
    const deletedId = randomUUID();
    await client.query(
      "INSERT INTO users (id,dni,password,\"updatedAt\") VALUES ($1,$1,'test',now())",
      [owner],
    );
    await client.query(
      "INSERT INTO species (id,code,name,\"userId\",\"updatedAt\") VALUES ($1,'ALPACA','Alpaca',$2,now())",
      [speciesId, owner],
    );
    await client.query(
      'INSERT INTO animals (id,crotal,sex,"speciesId","userId","updatedAt") VALUES ($1,\'A\',\'FEMALE\',$2,$3,now())',
      [animalId, speciesId, owner],
    );
    await client.query(
      'INSERT INTO animals (id,crotal,sex,"speciesId","userId","updatedAt","deletedAt") VALUES ($1,\'B\',\'FEMALE\',$2,$3,now(),now())',
      [deletedId, speciesId, owner],
    );
    const before = (await client.query("SELECT * FROM animals ORDER BY id"))
      .rows;
    await migrate("20260905010000_watermelon_sync");
    await migrate("20260905020000_sync_ownership");
    expect(
      (await client.query("SELECT * FROM animals ORDER BY id")).rows,
    ).toEqual(before);
    const rows = (
      await client.query(
        'SELECT * FROM sync_records WHERE "tableName" = \'animals\' ORDER BY "recordId"',
      )
    ).rows;
    expect(rows.find((row) => row.recordId === animalId)).toMatchObject({
      createdVersion: "1",
      version: "1",
      deleted: false,
    });
    expect(rows.find((row) => row.recordId === deletedId)).toMatchObject({
      deleted: true,
      data: null,
    });
    await client.query("UPDATE animals SET crotal = 'C' WHERE id=$1", [
      animalId,
    ]);
    expect(
      (
        await client.query(
          'SELECT version FROM sync_clocks WHERE "userId"=$1',
          [owner],
        )
      ).rows[0].version,
    ).toBe("2");
    const beforeCleanup = (
      await client.query("SELECT * FROM animals ORDER BY id")
    ).rows;
    const trackingBefore = (
      await client.query(
        'SELECT * FROM sync_records ORDER BY "tableName", "recordId"',
      )
    ).rows;
    await client.query(
      'INSERT INTO sync_receipts ("userId", hash) VALUES ($1, $2)',
      [owner, "confirmed-batch"],
    );
    await migrate("20260908000000_animal_device_dates");
    expect(
      (await client.query("SELECT * FROM animals ORDER BY id")).rows,
    ).toEqual(
      beforeCleanup.map(
        ({ syncStatus: _status, syncVersion: _version, ...animal }) => animal,
      ),
    );
    expect(
      (
        await client.query(
          'SELECT * FROM sync_records ORDER BY "tableName", "recordId"',
        )
      ).rows,
    ).toEqual(
      trackingBefore.map((row) => {
        if (row.tableName !== "animals" || !row.data) return row;
        const {
          syncStatus: _status,
          syncVersion: _version,
          ...data
        } = row.data;
        return { ...row, data };
      }),
    );
    expect(
      (
        await client.query(
          'SELECT version FROM sync_clocks WHERE "userId"=$1',
          [owner],
        )
      ).rows[0].version,
    ).toBe("2");
    expect(
      (
        await client.query('SELECT hash FROM sync_receipts WHERE "userId"=$1', [
          owner,
        ])
      ).rows,
    ).toEqual([{ hash: "confirmed-batch" }]);
  });
  it("fails the ownership preflight without modifying corrupt legacy data", async () => {
    const owner = randomUUID();
    const other = randomUUID();
    const speciesId = randomUUID();
    const animalId = randomUUID();
    for (const id of [owner, other])
      await client.query(
        "INSERT INTO users (id,dni,password,\"updatedAt\") VALUES ($1,$1,'test',now())",
        [id],
      );
    await client.query(
      "INSERT INTO species (id,code,name,\"userId\",\"updatedAt\") VALUES ($1,'ALPACA','Alpaca',$2,now())",
      [speciesId, owner],
    );
    await client.query(
      'INSERT INTO animals (id,crotal,sex,"speciesId","userId","updatedAt") VALUES ($1,\'A\',\'FEMALE\',$2,$3,now())',
      [animalId, speciesId, other],
    );
    await migrate("20260905010000_watermelon_sync");
    await expect(
      migrate("20260905020000_sync_ownership"),
    ).rejects.toMatchObject({ code: "23514" });
    await client.query("ROLLBACK");
    expect(
      (
        await client.query('SELECT "userId" FROM animals WHERE id=$1', [
          animalId,
        ])
      ).rows[0].userId,
    ).toBe(other);
  });
});

describe("Pull resource limits", () => {
  it("rejects excess rows instead of returning a truncated dataset/checkpoint", async () => {
    const session = {
      checkpoint: async () => 1n,
      changesSince: async () => new Array(20001),
    } as unknown as SyncSession;
    const repository: IWatermelonRepository = {
      transaction: async (_user, _mode, work) => work(session),
    };
    const service = new WatermelonService(repository);
    await expect(
      service.pull(
        randomUUID(),
        watermelonPullSchema.parse({ lastPulledAt: null, schemaVersion: 7 }),
      ),
    ).rejects.toMatchObject({ statusCode: 413, code: "SYNC_SCOPE_TOO_LARGE" });
  });
});
