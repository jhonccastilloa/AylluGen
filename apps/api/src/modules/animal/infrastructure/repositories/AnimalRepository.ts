import { injectable } from "inversify";
import { prisma } from "../../../../infrastructure/database/prisma/client";
import {
  Animal,
  AnimalCreateDTO,
  AnimalUpdateDTO,
  Sex,
  SpeciesCode,
  SyncStatus,
} from "../../../animal/domain/entities/Animal";
import { IAnimalRepository } from "../../../animal/domain/repositories/IAnimalRepository";

type AnimalWithRelations = any;

@injectable()
export class AnimalRepository implements IAnimalRepository {
  async findById(id: string): Promise<Animal | null> {
    const animal = await (prisma.animal as any).findUnique({
      where: { id, deletedAt: null },
      include: { speciesCatalog: true },
    });
    return animal ? this.mapToEntity(animal) : null;
  }

  async findByCrotal(crotal: string, userId: string): Promise<Animal | null> {
    const animal = await (prisma.animal as any).findFirst({
      where: { userId, crotal },
      include: { speciesCatalog: true },
    });

    return animal ? this.mapToEntity(animal) : null;
  }

  async findAllByUserId(
    userId: string,
    includeDeleted = false,
  ): Promise<Animal[]> {
    const animals = await (prisma.animal as any).findMany({
      where: includeDeleted ? { userId } : { userId, deletedAt: null },
      include: { speciesCatalog: true },
      orderBy: { clientCreatedAt: "desc" },
    });

    return animals.map((item: any) => this.mapToEntity(item));
  }

  async create(data: AnimalCreateDTO): Promise<Animal> {
    const animal = await (prisma.animal as any).create({
      data,
      include: { speciesCatalog: true },
    });
    return this.mapToEntity(animal);
  }

  async update(id: string, data: AnimalUpdateDTO): Promise<Animal> {
    const animal = await (prisma.animal as any).update({
      where: { id },
      data: {
        ...data,
        clientUpdatedAt: new Date(),
        syncVersion: { increment: 1 },
      },
      include: { speciesCatalog: true },
    });

    return this.mapToEntity(animal);
  }

  async delete(id: string): Promise<void> {
    await (prisma.animal as any).update({
      where: { id },
      data: {
        deletedAt: new Date(),
        syncStatus: "DELETED",
        syncVersion: { increment: 1 },
      },
    });
  }

  async findPedigree(animalId: string): Promise<Animal | null> {
    const animal = await (prisma.animal as any).findUnique({
      where: { id: animalId },
      include: {
        speciesCatalog: true,
        father: {
          include: {
            speciesCatalog: true,
            father: { include: { speciesCatalog: true } },
            mother: { include: { speciesCatalog: true } },
          },
        },
        mother: {
          include: {
            speciesCatalog: true,
            father: { include: { speciesCatalog: true } },
            mother: { include: { speciesCatalog: true } },
          },
        },
      },
    });

    return animal ? this.mapToEntity(animal) : null;
  }

  async findParents(
    animalId: string,
  ): Promise<{ father?: Animal; mother?: Animal } | null> {
    const animal = await (prisma.animal as any).findUnique({
      where: { id: animalId },
      include: {
        father: { include: { speciesCatalog: true } },
        mother: { include: { speciesCatalog: true } },
      },
    });

    if (!animal) return null;

    return {
      father: animal.father ? this.mapToEntity(animal.father) : undefined,
      mother: animal.mother ? this.mapToEntity(animal.mother) : undefined,
    };
  }

  async findChildren(animalId: string): Promise<Animal[]> {
    const children = await (prisma.animal as any).findMany({
      where: { OR: [{ fatherId: animalId }, { motherId: animalId }] },
      include: { speciesCatalog: true },
    });

    return children.map((item: any) => this.mapToEntity(item));
  }

  async findBySpecies(userId: string, species: SpeciesCode): Promise<Animal[]> {
    const animals = await (prisma.animal as any).findMany({
      where: {
        userId,
        deletedAt: null,
        speciesCatalog: {
          code: species,
        },
      },
      include: { speciesCatalog: true },
    });

    return animals.map((item: any) => this.mapToEntity(item));
  }

  async findBySex(userId: string, sex: Sex): Promise<Animal[]> {
    const animals = await (prisma.animal as any).findMany({
      where: { userId, sex, deletedAt: null },
      include: { speciesCatalog: true },
    });

    return animals.map((item: any) => this.mapToEntity(item));
  }

  async findFounders(userId: string): Promise<Animal[]> {
    const animals = await (prisma.animal as any).findMany({
      where: { userId, isFounder: true, deletedAt: null },
      include: { speciesCatalog: true },
    });

    return animals.map((item: any) => this.mapToEntity(item));
  }

  private mapToEntity(data: AnimalWithRelations): Animal {
    return {
      id: data.id,
      crotal: data.crotal,
      sex: data.sex as Sex,
      speciesId: data.speciesId,
      species: data.speciesCatalog?.code ?? "",
      speciesName: data.speciesCatalog?.name ?? undefined,
      birthDate: data.birthDate ?? undefined,
      isFounder: data.isFounder,
      fatherId: data.fatherId ?? undefined,
      motherId: data.motherId ?? undefined,
      father: data.father ? this.mapToEntity(data.father) : undefined,
      mother: data.mother ? this.mapToEntity(data.mother) : undefined,
      children: undefined,
      userId: data.userId,
      syncStatus: data.syncStatus as SyncStatus,
      syncVersion: data.syncVersion,
      clientCreatedAt: data.clientCreatedAt ?? data.createdAt,
      clientUpdatedAt: data.clientUpdatedAt ?? data.updatedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      deletedAt: data.deletedAt ?? undefined,
    };
  }
}
