import { SpecieEntity } from "@ayllugen/core/species/domain/entities/SpecieEntity";
import type { ISpecieRepository } from "@ayllugen/core/species/domain/ports/SpecieRepository";
import type { PrismaTransaction } from "@infrastructure/database/prisma/client";

type ISpecieRow = NonNullable<
  Awaited<ReturnType<PrismaTransaction["species"]["findFirst"]>>
>;

export class SpeciePrismaRepository implements ISpecieRepository {
  constructor(private readonly db: PrismaTransaction) {}

  async list(userId: string): Promise<SpecieEntity[]> {
    const rows = await this.db.species.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });
    return rows.map(SpeciePrismaRepository.toEntity);
  }

  async findById(userId: string, id: string): Promise<SpecieEntity | null> {
    const row = await this.db.species.findFirst({
      where: { userId, id },
    });
    return row ? SpeciePrismaRepository.toEntity(row) : null;
  }

  async findByName(userId: string, name: string): Promise<SpecieEntity | null> {
    const row = await this.db.species.findFirst({
      where: {
        userId,
        name: { equals: name, mode: "insensitive" },
      },
    });
    return row ? SpeciePrismaRepository.toEntity(row) : null;
  }

  async hasAnimals(userId: string, specieId: string): Promise<boolean> {
    const count = await this.db.animal.count({
      // Historical animals still reference their species through the foreign key.
      where: { userId, speciesId: specieId },
    });
    return count > 0;
  }

  async insert(specie: SpecieEntity): Promise<SpecieEntity> {
    const row = await this.db.species.create({
      data: {
        id: specie.id,
        userId: specie.userId,
        name: specie.name,
        description: specie.description,
      },
    });
    return SpeciePrismaRepository.toEntity(row);
  }

  async update(specie: SpecieEntity): Promise<SpecieEntity> {
    const row = await this.db.species.update({
      where: { id: specie.id, userId: specie.userId },
      data: {
        name: specie.name,
        description: specie.description,
        clientUpdatedAt: new Date(),
      },
    });
    return SpeciePrismaRepository.toEntity(row);
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.db.species.delete({
      where: { id, userId },
    });
  }

  private static toEntity(row: ISpecieRow): SpecieEntity {
    return SpecieEntity.restore({
      id: row.id,
      userId: row.userId,
      name: row.name,
      description: row.description,
    });
  }
}
