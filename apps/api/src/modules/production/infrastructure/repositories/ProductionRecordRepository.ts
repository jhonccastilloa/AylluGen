import { injectable } from "inversify";
import { prisma } from "../../../../infrastructure/database/prisma/client";
import {
  ProductionRecord,
  ProductionRecordCreateInput,
  ProductionRecordUpdateInput,
  ProductionSummary,
  ProductionType,
  SyncStatus,
} from "../../../production/domain/entities/ProductionRecord";
import { IProductionRecordRepository } from "../../../production/domain/repositories/IProductionRecordRepository";
import {
  Animal,
  Sex,
  SyncStatus as AnimalSyncStatus,
} from "../../../animal/domain/entities/Animal";

type ProductionRecordWithAnimal = any;

@injectable()
export class ProductionRecordRepository implements IProductionRecordRepository {
  async findById(id: string): Promise<ProductionRecord | null> {
    const record = await (prisma.productionRecord as any).findUnique({
      where: { id },
      include: { animal: { include: { speciesCatalog: true } } },
    });

    return record ? this.mapToEntity(record) : null;
  }

  async findAllByUserId(userId: string): Promise<ProductionRecord[]> {
    const records = await (prisma.productionRecord as any).findMany({
      where: { userId },
      include: { animal: { include: { speciesCatalog: true } } },
      orderBy: { date: "desc" },
    });

    return records.map((record: any) => this.mapToEntity(record));
  }

  async findByAnimalId(animalId: string): Promise<ProductionRecord[]> {
    const records = await (prisma.productionRecord as any).findMany({
      where: { animalId },
      include: { animal: { include: { speciesCatalog: true } } },
      orderBy: { date: "desc" },
    });

    return records.map((record: any) => this.mapToEntity(record));
  }

  async findByType(
    userId: string,
    type: ProductionType,
  ): Promise<ProductionRecord[]> {
    const records = await (prisma.productionRecord as any).findMany({
      where: { userId, type },
      include: { animal: { include: { speciesCatalog: true } } },
      orderBy: { date: "desc" },
    });

    return records.map((record: any) => this.mapToEntity(record));
  }

  async create(data: ProductionRecordCreateInput): Promise<ProductionRecord> {
    const record = await (prisma.productionRecord as any).create({
      data,
      include: { animal: { include: { speciesCatalog: true } } },
    });

    return this.mapToEntity(record);
  }

  async update(
    id: string,
    data: ProductionRecordUpdateInput,
  ): Promise<ProductionRecord> {
    const record = await (prisma.productionRecord as any).update({
      where: { id },
      data: { ...data, clientUpdatedAt: new Date(), syncVersion: { increment: 1 } },
      include: { animal: { include: { speciesCatalog: true } } },
    });

    return this.mapToEntity(record);
  }

  async delete(id: string): Promise<void> {
    await (prisma.productionRecord as any).delete({ where: { id } });
  }

  async findRecentByAnimal(
    animalId: string,
    limit = 10,
  ): Promise<ProductionRecord[]> {
    const records = await (prisma.productionRecord as any).findMany({
      where: { animalId },
      include: { animal: { include: { speciesCatalog: true } } },
      orderBy: { date: "desc" },
      take: limit,
    });

    return records.map((record: any) => this.mapToEntity(record));
  }

  async calculateSummary(
    animalId: string,
    type: ProductionType,
  ): Promise<ProductionSummary | null> {
    const records = await prisma.productionRecord.findMany({
      where: { animalId, type },
      orderBy: { date: "asc" },
    });

    if (records.length === 0) {
      return null;
    }

    const animal = await prisma.animal.findUnique({ where: { id: animalId } });
    if (!animal) {
      return null;
    }

    const values = records.map((record) => record.value);
    const averageValue = values.reduce((sum, value) => sum + value, 0) / values.length;

    const qualityScores = records
      .filter((record) => record.qualityScore !== null)
      .map((record) => record.qualityScore as number);
    const averageQualityScore =
      qualityScores.length > 0
        ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
        : null;

    const half = Math.floor(values.length / 2);
    const recentValues = values.slice(-half);
    const olderValues = values.slice(0, half);
    const recentAvg =
      recentValues.reduce((sum, value) => sum + value, 0) / recentValues.length;
    const olderAvg =
      olderValues.reduce((sum, value) => sum + value, 0) / olderValues.length;

    let trend: "improving" | "stable" | "declining" = "stable";
    const diff = recentAvg - olderAvg;
    const threshold = olderAvg * 0.05;

    if (diff > threshold) {
      trend = "improving";
    } else if (diff < -threshold) {
      trend = "declining";
    }

    return {
      animalId,
      animalCrotal: animal.crotal,
      type,
      totalRecords: records.length,
      averageValue,
      averageQualityScore,
      lastRecord: records[records.length - 1].date,
      trend,
    };
  }

  private mapToEntity(data: ProductionRecordWithAnimal): ProductionRecord {
    return {
      id: data.id,
      animalId: data.animalId,
      animal: data.animal ? this.mapAnimalToEntity(data.animal) : undefined,
      type: data.type as ProductionType,
      date: data.date,
      value: data.value,
      unit: data.unit,
      qualityScore: data.qualityScore ?? undefined,
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
