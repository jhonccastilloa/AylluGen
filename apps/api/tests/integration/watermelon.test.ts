import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import type { Server } from "node:http";
import App from "../../src/server";
import { generateAccessToken } from "../../src/shared/utils/jwt";
import { prisma } from "../../src/infrastructure/database/prisma/client";
import { WatermelonRepository } from "../../src/modules/sync/infrastructure/repositories/WatermelonRepository";
import { WatermelonService } from "../../src/modules/sync/application/services/WatermelonService";
import {
  watermelonPullSchema,
  watermelonPushSchema,
} from "../../src/modules/sync/application/schemas/watermelon.schema";
import {
  Changes,
  RawRecord,
  SyncTable,
} from "../../src/modules/sync/domain/entities/Watermelon";
import {
  IWatermelonRepository,
  SyncSession,
} from "../../src/modules/sync/domain/repositories/IWatermelonRepository";

jest.unmock("../../src/infrastructure/database/prisma/client");
jest.mock("../../src/shared/logging", () => {
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
  });
  const change = (
    created: RawRecord[] = [],
    updated: RawRecord[] = [],
    deleted: string[] = [],
  ) => ({ created, updated, deleted });
  const pull = (since: number | null = null, owner = userId) =>
    service.pull(
      owner,
      watermelonPullSchema.parse({ lastPulledAt: since, schemaVersion: 4 }),
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
    expect(
      (await pull()).changes.species.created[0].created_at,
    ).toBeGreaterThan(1);
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
  it("backfills whitelisted migration tables and columns even below checkpoint", async () => {
    const { s, checkpoint } = await seed();
    const result = await service.pull(
      userId,
      watermelonPullSchema.parse({
        lastPulledAt: checkpoint,
        schemaVersion: 4,
        migration: {
          from: 3,
          tables: ["species"],
          columns: [{ table: "animals", columns: ["species_id"] }],
        },
      }),
    );
    expect(result.changes.species.created[0].id).toBe(s.id);
    expect(result.changes.animals.updated).toHaveLength(1);
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
      expect(await session.changesSince(BigInt(checkpoint), [])).toHaveLength(
        0,
      );
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
    const token = generateAccessToken({ userId, dni: "test" });
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
          { lastPulledAt: null, schemaVersion: 4 },
          false,
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await call("/sync/v2/pull", {
          lastPulledAt: null,
          schemaVersion: 4,
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
      schemaVersion: 4,
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
  it("legacy pull derives owner from JWT even when the body claims another account", async () => {
    const { a } = await seed();
    const other = await newUser();
    const response = await fetch(`${baseUrl}/sync/pull`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${generateAccessToken({ userId: other, dni: "test" })}`,
      },
      body: JSON.stringify({ userId, deviceId: "legacy", tables: ["animals"] }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.has("deprecation")).toBe(true);
    expect(
      ((await response.json()) as { animals: RawRecord[] }).animals.some(
        (record) => record.id === a.id,
      ),
    ).toBe(false);
  });
  it("HTTP rejects oversized payloads without logging or applying their contents", async () => {
    const response = await fetch(`${baseUrl}/sync/v2/push`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${generateAccessToken({ userId, dni: "test" })}`,
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
      body: JSON.stringify({ lastPulledAt: null, schemaVersion: 4 }),
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
    expect(
      watermelonPullSchema.safeParse({
        lastPulledAt: 1,
        schemaVersion: 4,
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
        watermelonPullSchema.parse({ lastPulledAt: null, schemaVersion: 4 }),
      ),
    ).rejects.toMatchObject({ statusCode: 413, code: "SYNC_SCOPE_TOO_LARGE" });
  });
});
