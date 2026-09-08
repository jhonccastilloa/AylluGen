import { injectable } from "inversify";
import { prisma } from "../../../../infrastructure/database/prisma/client";
import {
  RiskLevel,
  Breeding,
  BreedingCreateInput,
  SyncStatus,
  BreedingUpdateInput,
} from "../../../breeding/domain/entities/Breeding";
import { Animal, Sex, SyncStatus as AnimalSyncStatus } from "../../../animal/domain/entities/Animal";
import { IBreedingRepository } from "../../../breeding/domain/repositories/IBreedingRepository";

type BreedingWithRelations = any;

@injectable()
export class BreedingRepository implements IBreedingRepository {
  async findById(id: string): Promise<Breeding | null> {
    const breeding = await (prisma.breeding as any).findUnique({
      where: { id },
      include: { offspring: { include: { speciesCatalog: true } } },
    });

    return breeding ? this.mapToEntity(breeding) : null;
  }

  async findByParents(
    maleId: string,
    femaleId: string,
  ): Promise<Breeding | null> {
    const breeding = await (prisma.breeding as any).findFirst({
      where: { maleId, femaleId },
      include: { offspring: { include: { speciesCatalog: true } } },
    });

    return breeding ? this.mapToEntity(breeding) : null;
  }

  async findAllByUserId(userId: string): Promise<Breeding[]> {
    const breedings = await (prisma.breeding as any).findMany({
      where: { userId },
      include: { offspring: { include: { speciesCatalog: true } } },
      orderBy: { clientCreatedAt: "desc" },
    });

    return breedings.map((b: any) => this.mapToEntity(b));
  }

  async create(data: BreedingCreateInput): Promise<Breeding> {
    const breeding = await (prisma.breeding as any).create({
      data,
      include: { offspring: { include: { speciesCatalog: true } } },
    });

    return this.mapToEntity(breeding);
  }

  async update(id: string, data: BreedingUpdateInput): Promise<Breeding> {
    const breeding = await (prisma.breeding as any).update({
      where: { id },
      data: { ...data, clientUpdatedAt: new Date(), syncVersion: { increment: 1 } },
      include: { offspring: { include: { speciesCatalog: true } } },
    });

    return this.mapToEntity(breeding);
  }

  async delete(id: string): Promise<void> {
    await (prisma.breeding as any).delete({ where: { id } });
  }

  async findBreedingHistory(animalId: string): Promise<Breeding[]> {
    const breedings = await (prisma.breeding as any).findMany({
      where: { OR: [{ maleId: animalId }, { femaleId: animalId }] },
      include: { offspring: { include: { speciesCatalog: true } } },
      orderBy: { clientCreatedAt: "desc" },
    });

    return breedings.map((b: any) => this.mapToEntity(b));
  }

  private mapToEntity(data: BreedingWithRelations): Breeding {
    return {
      id: data.id,
      maleId: data.maleId,
      femaleId: data.femaleId,
      projectedCOI: data.projectedCOI,
      riskLevel: data.riskLevel as RiskLevel,
      offspringId: data.offspringId ?? undefined,
      offspring: data.offspring ? this.mapAnimalToEntity(data.offspring) : undefined,
      breedingDate: data.breedingDate ?? undefined,
      notes: data.notes ?? undefined,
      userId: data.userId,
      syncStatus: data.syncStatus as SyncStatus,
      syncVersion: data.syncVersion,
      clientCreatedAt: data.clientCreatedAt ?? data.createdAt,
      clientUpdatedAt: data.clientUpdatedAt ?? data.updatedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  private mapAnimalToEntity(data: any): Animal {
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
      userId: data.userId,
      syncStatus: data.syncStatus as AnimalSyncStatus,
      syncVersion: data.syncVersion,
      clientCreatedAt: data.clientCreatedAt ?? data.createdAt,
      clientUpdatedAt: data.clientUpdatedAt ?? data.updatedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      deletedAt: data.deletedAt ?? undefined,
    };
  }
}
