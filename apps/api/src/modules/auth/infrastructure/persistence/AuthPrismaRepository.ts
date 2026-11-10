import { UserEntity } from "@ayllugen/core/user/domain/entities/UserEntity";
import type { IAuthRepository } from "@ayllugen/core/auth/domain/ports/AuthRepository";
import type { RefreshTokenEntity } from "@ayllugen/core/auth/domain/entities/RefreshTokenEntity";
import type {
  PrismaClient,
  Prisma,
} from "../../../../infrastructure/database/prisma/generated/client";

export class AuthPrismaRepository implements IAuthRepository {
  constructor(private readonly db: PrismaClient) {}

  async register(
    user: UserEntity,
    session: RefreshTokenEntity,
  ): Promise<UserEntity> {
    const row = await this.db.user.create({
      data: {
        id: user.id,
        dni: user.dni,
        password: user.passwordHash,
        refreshToken: {
          create: { token: session.token, expiresAt: session.expiresAt },
        },
      },
    });
    return UserEntity.restore({
      id: row.id,
      dni: row.dni,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      passwordHash: row.password,
    });
  }

  // Login, refresh and password changes serialize on the account row. The hash
  // comparison prevents issuing a session using credentials checked before a change.
  private async lockUser(
    tx: Prisma.TransactionClient,
    user: UserEntity,
  ): Promise<boolean> {
    const rows = await tx.$queryRaw<Array<{ password: string }>>`
      SELECT password FROM users WHERE id = ${user.id} FOR UPDATE
    `;
    return rows[0]?.password === user.passwordHash;
  }

  openSession(user: UserEntity, session: RefreshTokenEntity): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      if (!(await this.lockUser(tx, user))) return false;
      await tx.refreshToken.create({
        data: {
          userId: session.userId,
          token: session.token,
          expiresAt: session.expiresAt,
        },
      });
      return true;
    });
  }

  rotateSession(
    user: UserEntity,
    previousToken: string,
    session: RefreshTokenEntity,
  ): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      if (!(await this.lockUser(tx, user))) return false;
      const removed = await tx.refreshToken.deleteMany({
        where: {
          userId: user.id,
          token: previousToken,
          expiresAt: { gt: new Date() },
        },
      });
      if (removed.count !== 1) return false;
      await tx.refreshToken.create({
        data: {
          userId: session.userId,
          token: session.token,
          expiresAt: session.expiresAt,
        },
      });
      return true;
    });
  }

  async closeSession(token: string): Promise<void> {
    await this.db.refreshToken.deleteMany({ where: { token } });
  }

  changePassword(user: UserEntity, passwordHash: string): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      if (!(await this.lockUser(tx, user))) return false;
      await tx.user.update({
        where: { id: user.id },
        data: { password: passwordHash },
      });
      await tx.refreshToken.deleteMany({ where: { userId: user.id } });
      return true;
    });
  }
}
