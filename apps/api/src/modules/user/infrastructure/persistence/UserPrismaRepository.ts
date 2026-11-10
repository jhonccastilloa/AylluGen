import { UserEntity } from "@ayllugen/core/user/domain/entities/UserEntity";
import type { IUserRepository } from "@ayllugen/core/user/domain/ports/UserRepository";
import type { PrismaTransaction } from "../../../../infrastructure/database/prisma/client";

type IUserRow = NonNullable<
  Awaited<ReturnType<PrismaTransaction["user"]["findFirst"]>>
>;
export class UserPrismaRepository implements IUserRepository {
  constructor(private readonly db: PrismaTransaction) {}
  async findById(id: string): Promise<UserEntity | null> {
    const row = await this.db.user.findUnique({ where: { id } });
    return row ? UserPrismaRepository.toEntity(row) : null;
  }
  async findByDni(dni: string): Promise<UserEntity | null> {
    const row = await this.db.user.findUnique({ where: { dni } });
    return row ? UserPrismaRepository.toEntity(row) : null;
  }
  private static toEntity(row: IUserRow): UserEntity {
    return UserEntity.restore({
      id: row.id,
      dni: row.dni,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      passwordHash: row.password,
    });
  }
}
