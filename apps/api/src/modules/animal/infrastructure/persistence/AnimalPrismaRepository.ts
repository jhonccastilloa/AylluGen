import { AnimalEntity } from "@ayllugen/core/animal/domain/entities/AnimalEntity";
import type {
  IAnimalQuery,
  IAnimalRepository,
  IAnimalStore,
} from "@ayllugen/core/animal/domain/ports/AnimalRepository";
import type { PrismaTransaction } from "@infrastructure/database/prisma/client";
import type {
  Animal,
  Prisma,
  PrismaClient,
} from "@infrastructure/database/prisma/generated/client";

class AnimalPrismaStore implements IAnimalStore {
  constructor(protected readonly db: PrismaTransaction) {}

  async findById(userId: string, id: string): Promise<AnimalEntity | null> {
    const row = await this.db.animal.findFirst({ where: { userId, id } });
    return row ? AnimalPrismaStore.toEntity(row) : null;
  }

  async findByCode(userId: string, code: string): Promise<AnimalEntity | null> {
    const row = await this.db.animal.findFirst({ where: { userId, code } });
    return row ? AnimalPrismaStore.toEntity(row) : null;
  }

  async findByCrotal(
    userId: string,
    crotal: string,
  ): Promise<AnimalEntity | null> {
    const row = await this.db.animal.findFirst({ where: { userId, crotal } });
    return row ? AnimalPrismaStore.toEntity(row) : null;
  }

  async speciesExists(userId: string, speciesId: string): Promise<boolean> {
    return (
      (await this.db.species.findFirst({
        where: { userId, id: speciesId },
        select: { id: true },
      })) !== null
    );
  }

  async hasReferences(userId: string, id: string): Promise<boolean> {
    const row = await this.db.animal.findFirst({
      where: { userId, id },
      select: {
        _count: {
          select: {
            fatherOf: true,
            motherOf: true,
            healthRecords: true,
            productionRecords: true,
            breedings: true,
            maleBreedings: true,
            femaleBreedings: true,
          },
        },
      },
    });
    return row !== null && Object.values(row._count).some((count) => count > 0);
  }

  async hasAncestor(
    userId: string,
    id: string,
    ancestorId: string,
  ): Promise<boolean> {
    const rows = await this.db.$queryRaw<{ found: boolean }[]>`
      WITH RECURSIVE ancestry AS (
        SELECT id, "fatherId", "motherId" FROM animals WHERE "userId" = ${userId} AND id = ${id}
        UNION
        SELECT a.id, a."fatherId", a."motherId" FROM animals a
        JOIN ancestry p ON a.id = p."fatherId" OR a.id = p."motherId"
        WHERE a."userId" = ${userId}
      ) SELECT EXISTS(SELECT 1 FROM ancestry WHERE id = ${ancestorId}) AS found`;
    return rows[0].found;
  }

  async hasChildrenBornOnOrBefore(
    userId: string,
    id: string,
    date: string,
  ): Promise<boolean> {
    return (
      (await this.db.animal.findFirst({
        where: {
          userId,
          OR: [{ fatherId: id }, { motherId: id }],
          birthDate: { lte: new Date(`${date}T00:00:00.000Z`) },
        },
        select: { id: true },
      })) !== null
    );
  }

  async list(
    userId: string,
    query: IAnimalQuery,
  ): Promise<{ animals: AnimalEntity[]; total: number }> {
    // Escape LIKE metacharacters so a code search is literal substring matching.
    const search = query.search?.replace(/[\\%_]/g, "\\$&");
    const where: Prisma.AnimalWhereInput = {
      userId,
      speciesId: query.speciesId,
      sex: query.sex,
      status: query.status,
      AND: [
        ...(query.parentId
          ? [
              {
                OR: [
                  { fatherId: query.parentId },
                  { motherId: query.parentId },
                ],
              },
            ]
          : []),
        ...(search
          ? [
              {
                OR: [
                  { code: { contains: search, mode: "insensitive" as const } },
                  {
                    crotal: { contains: search, mode: "insensitive" as const },
                  },
                ],
              },
            ]
          : []),
      ],
    };
    const [rows, total] = await Promise.all([
      this.db.animal.findMany({
        where,
        orderBy: [{ code: "asc" }, { id: "asc" }],
        take: query.limit,
        skip: query.offset,
      }),
      this.db.animal.count({ where }),
    ]);
    return { animals: rows.map(AnimalPrismaStore.toEntity), total };
  }

  async create(animal: AnimalEntity): Promise<AnimalEntity> {
    const row = await this.db.animal.create({
      data: {
        id: animal.id,
        userId: animal.userId,
        ...AnimalPrismaStore.toData(animal),
      },
    });
    return AnimalPrismaStore.toEntity(row);
  }

  async update(animal: AnimalEntity): Promise<AnimalEntity> {
    const row = await this.db.animal.update({
      where: { id: animal.id, userId: animal.userId },
      data: {
        ...AnimalPrismaStore.toData(animal),
        clientUpdatedAt: new Date(),
      },
    });
    return AnimalPrismaStore.toEntity(row);
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.db.animal.delete({ where: { id, userId } });
  }

  private static toData(animal: AnimalEntity) {
    return {
      code: animal.code,
      crotal: animal.crotal,
      sex: animal.sex,
      speciesId: animal.speciesId,
      birthDate:
        animal.birthDate === null
          ? null
          : new Date(`${animal.birthDate}T00:00:00.000Z`),
      fatherId: animal.fatherId,
      motherId: animal.motherId,
      status: animal.status,
      exitDate:
        animal.exitDate === null
          ? null
          : new Date(`${animal.exitDate}T00:00:00.000Z`),
    };
  }

  private static toEntity(row: Animal): AnimalEntity {
    return AnimalEntity.restore({
      id: row.id,
      userId: row.userId,
      code: row.code,
      crotal: row.crotal,
      speciesId: row.speciesId,
      sex: row.sex,
      birthDate: row.birthDate?.toISOString().slice(0, 10) ?? null,
      fatherId: row.fatherId,
      motherId: row.motherId,
      status: row.status,
      exitDate: row.exitDate?.toISOString().slice(0, 10) ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}

export class AnimalPrismaRepository
  extends AnimalPrismaStore
  implements IAnimalRepository
{
  constructor(private readonly client: PrismaClient) {
    super(client);
  }

  async withOwnerTransaction<T>(
    userId: string,
    operation: (store: IAnimalStore) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction(
      async (transaction) => {
        // Lock before reading; reuse the existing per-owner write mutex used by
        // sync_track. Concurrent Animal mutations cannot validate stale pedigree.
        await transaction.$queryRaw`SELECT "userId" FROM sync_clocks WHERE "userId" = ${userId} FOR UPDATE`;
        return operation(new AnimalPrismaStore(transaction));
      },
      { isolationLevel: "ReadCommitted" },
    );
  }
}
