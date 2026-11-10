import { AuthPrismaRepository } from "../../../src/modules/auth/infrastructure/persistence/AuthPrismaRepository";
import type { PrismaClient } from "../../../src/infrastructure/database/prisma/generated/client";
import { UserEntity } from "@ayllugen/core/user/domain/entities/UserEntity";
import { RefreshTokenEntity } from "@ayllugen/core/auth/domain/entities/RefreshTokenEntity";

describe("Auth persistence atomic operations", () => {
  const user = UserEntity.restore({
    id: "owner",
    dni: "12345678",
    passwordHash: "checked-hash",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const session = RefreshTokenEntity.create({
    userId: "owner",
    token: "new-refresh",
    expiresAt: new Date(Date.now() + 60_000),
  });
  function setup() {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ password: "checked-hash" }]),
      user: { update: jest.fn().mockResolvedValue({}) },
      refreshToken: {
        create: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const db = {
      $transaction: jest.fn(async (work: (t: typeof tx) => Promise<unknown>) =>
        work(tx),
      ),
      user: { create: jest.fn() },
    };
    return {
      tx,
      db,
      repo: new AuthPrismaRepository(db as unknown as PrismaClient),
    };
  }
  test("a credential change prevents stale login or refresh from creating a session", async () => {
    const { tx, repo } = setup();
    tx.$queryRaw.mockResolvedValue([{ password: "changed-hash" }]);
    expect(await repo.openSession(user, session)).toBe(false);
    expect(await repo.rotateSession(user, "old-refresh", session)).toBe(false);
    expect(await repo.changePassword(user, "new-hash")).toBe(false);
    expect(tx.refreshToken.create).not.toHaveBeenCalled();
    expect(tx.refreshToken.deleteMany).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
  });
  test("maps a new session to Prisma data after checking credentials", async () => {
    const { tx, repo } = setup();
    expect(await repo.openSession(user, session)).toBe(true);
    expect(tx.refreshToken.create).toHaveBeenCalledWith({
      data: {
        userId: "owner",
        token: "new-refresh",
        expiresAt: session.expiresAt,
      },
    });
  });
  test("rotation only replaces a consumed, unexpired token belonging to the user", async () => {
    const { tx, repo } = setup();
    tx.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
    expect(await repo.rotateSession(user, "old-refresh", session)).toBe(false);
    expect(tx.refreshToken.create).not.toHaveBeenCalled();
    expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "owner",
        token: "old-refresh",
        expiresAt: { gt: expect.any(Date) },
      },
    });
    tx.refreshToken.deleteMany.mockResolvedValue({ count: 1 });
    expect(await repo.rotateSession(user, "old-refresh", session)).toBe(true);
    expect(tx.refreshToken.create).toHaveBeenCalledWith({
      data: {
        userId: "owner",
        token: "new-refresh",
        expiresAt: session.expiresAt,
      },
    });
  });
  test("password change and invalidation execute within the same transaction", async () => {
    const { tx, db, repo } = setup();
    await repo.changePassword(user, "new-hash");
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "owner" },
      data: { password: "new-hash" },
    });
    expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: "owner" },
    });
  });
  test("propagates replacement failure to abort the transaction instead of committing token consumption", async () => {
    const { tx, repo } = setup();
    const error = new Error("insert failed");
    tx.refreshToken.create.mockRejectedValue(error);
    await expect(repo.rotateSession(user, "old-refresh", session)).rejects.toBe(
      error,
    );
  });
});
