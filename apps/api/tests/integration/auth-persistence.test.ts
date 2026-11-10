import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/infrastructure/database/prisma/generated/client";
import { AuthPrismaRepository } from "../../src/modules/auth/infrastructure/persistence/AuthPrismaRepository";
import { UserEntity } from "@ayllugen/core/user/domain/entities/UserEntity";
import { RefreshTokenEntity } from "@ayllugen/core/auth/domain/entities/RefreshTokenEntity";

const connectionString = process.env.AUTH_TEST_DATABASE_URL;
const integration = connectionString ? describe : describe.skip;

integration("Auth PostgreSQL transactions", () => {
  const schema = `auth_test_${randomUUID().replaceAll("-", "")}`;
  let pool: Pool;
  let db: PrismaClient;
  let repo: AuthPrismaRepository;
  beforeAll(async () => {
    const options = {
      connectionString,
      connectionTimeoutMillis: 5_000,
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
      for (const dir of dirs)
        await client.query(
          await readFile(path.join(root, dir, "migration.sql"), "utf8"),
        );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    db = new PrismaClient({ adapter: new PrismaPg(options, { schema }) });
    repo = new AuthPrismaRepository(db);
  }, 60_000);
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
  const account = (dni: string) =>
    UserEntity.create({
      id: randomUUID(),
      dni,
      passwordHash: "old-hash",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  const session = (userId: string) =>
    RefreshTokenEntity.create({
      userId,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 60_000),
    });

  test("registers account and refresh atomically, rolling back on token failure", async () => {
    const user = account("10000001");
    const token = session(user.id);
    await repo.register(user, token);
    const other = account("10000002");
    await expect(
      repo.register(
        other,
        RefreshTokenEntity.create({
          userId: other.id,
          token: token.token,
          expiresAt: token.expiresAt,
        }),
      ),
    ).rejects.toBeDefined();
    expect(await db.user.findUnique({ where: { id: other.id } })).toBeNull();
  });

  test("allows independent sessions but only one winner when rotating the same token", async () => {
    const user = account("10000003");
    const first = session(user.id);
    const second = session(user.id);
    await repo.register(user, first);
    expect(await repo.openSession(user, second)).toBe(true);
    const results = await Promise.all([
      repo.rotateSession(user, first.token, session(user.id)),
      repo.rotateSession(user, first.token, session(user.id)),
    ]);
    expect(results.sort()).toEqual([false, true]);
    expect(await db.refreshToken.count({ where: { userId: user.id } })).toBe(2);
    expect(
      await db.refreshToken.findUnique({ where: { token: second.token } }),
    ).not.toBeNull();
  });

  test("restores a consumed refresh if inserting its replacement fails", async () => {
    const user = account("10000004");
    const first = session(user.id);
    const second = session(user.id);
    await repo.register(user, first);
    await repo.openSession(user, second);
    await expect(
      repo.rotateSession(user, first.token, second),
    ).rejects.toBeDefined();
    expect(
      await db.refreshToken.findUnique({ where: { token: first.token } }),
    ).not.toBeNull();
  });

  test("password changes invalidate sessions despite racing login and refresh", async () => {
    const user = account("10000005");
    const first = session(user.id);
    await repo.register(user, first);
    await Promise.all([
      repo.changePassword(user, "new-hash"),
      repo.openSession(user, session(user.id)),
      repo.rotateSession(user, first.token, session(user.id)),
    ]);
    expect(await db.refreshToken.count({ where: { userId: user.id } })).toBe(0);
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } })).password,
    ).toBe("new-hash");
    expect(await repo.openSession(user, session(user.id))).toBe(false);
  });
});
