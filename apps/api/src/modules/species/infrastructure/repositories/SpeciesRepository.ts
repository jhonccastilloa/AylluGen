import { injectable } from "inversify";
import { prisma } from "../../../../infrastructure/database/prisma/client";
import { ISpeciesRepository } from "../../domain/repositories/ISpeciesRepository";
import {
  Species,
  SpeciesCreateInput,
  SpeciesUpdateInput,
} from "../../domain/entities/Species";

@injectable()
export class SpeciesRepository implements ISpeciesRepository {
  async findById(id: string): Promise<Species | null> {
    const species = await (prisma as any).species.findUnique({
      where: { id, deletedAt: null },
    });
    return species ? this.mapToEntity(species) : null;
  }

  async findByCode(userId: string, code: string): Promise<Species | null> {
    const species = await (prisma as any).species.findFirst({
      where: { userId, code, deletedAt: null },
    });
    return species ? this.mapToEntity(species) : null;
  }

  async findByName(userId: string, name: string): Promise<Species | null> {
    const species = await (prisma as any).species.findFirst({
      where: { userId, name, deletedAt: null },
    });
    return species ? this.mapToEntity(species) : null;
  }

  async findAllByUserId(userId: string): Promise<Species[]> {
    const species = await (prisma as any).species.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ name: "asc" }],
    });
    return species.map((item: any) => this.mapToEntity(item));
  }

  async create(input: SpeciesCreateInput): Promise<Species> {
    const species = await (prisma as any).species.create({
      data: {
        userId: input.userId,
        code: input.code,
        name: input.name,
        description: input.description,
      },
    });
    return this.mapToEntity(species);
  }

  async update(id: string, input: SpeciesUpdateInput): Promise<Species> {
    const species = await (prisma as any).species.update({
      where: { id },
      data: {
        ...input,
      },
    });
    return this.mapToEntity(species);
  }

  async delete(id: string): Promise<void> {
    await (prisma as any).species.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async countAnimalsBySpeciesId(
    userId: string,
    speciesId: string,
  ): Promise<number> {
    return (prisma.animal as any).count({
      where: { userId, speciesId, deletedAt: null },
    });
  }

  private mapToEntity(data: any): Species {
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description ?? undefined,
      userId: data.userId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      deletedAt: data.deletedAt ?? undefined,
    };
  }
}
