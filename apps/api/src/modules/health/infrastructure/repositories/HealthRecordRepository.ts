import { injectable } from "inversify";
import { prisma } from "../../../../infrastructure/database/prisma/client";
import {
  HealthRecord,
  HealthRecordCreateInput,
  HealthRecordUpdateInput,
  HealthType,
  SyncStatus,
  UpcomingHealthTask,
} from "../../../health/domain/entities/HealthRecord";
import { IHealthRecordRepository } from "../../../health/domain/repositories/IHealthRecordRepository";
import {
  Animal,
  Sex,
  SyncStatus as AnimalSyncStatus,
} from "../../../animal/domain/entities/Animal";

type HealthRecordWithAnimal = any;

@injectable()
export class HealthRecordRepository implements IHealthRecordRepository {
  async findById(id: string): Promise<HealthRecord | null> {
    const record = await (prisma.healthRecord as any).findUnique({
      where: { id },
      include: { animal: { include: { speciesCatalog: true } } },
    });

    return record ? this.mapToEntity(record) : null;
  }

  async findAllByUserId(userId: string): Promise<HealthRecord[]> {
    const records = await (prisma.healthRecord as any).findMany({
      where: { userId },
      include: { animal: { include: { speciesCatalog: true } } },
      orderBy: { date: "desc" },
    });

    return records.map((record: any) => this.mapToEntity(record));
  }

  async findByAnimalId(animalId: string): Promise<HealthRecord[]> {
    const records = await (prisma.healthRecord as any).findMany({
      where: { animalId },
      include: { animal: { include: { speciesCatalog: true } } },
      orderBy: { date: "desc" },
    });

    return records.map((record: any) => this.mapToEntity(record));
  }

  async findByType(userId: string, type: HealthType): Promise<HealthRecord[]> {
    const records = await (prisma.healthRecord as any).findMany({
      where: { userId, type },
      include: { animal: { include: { speciesCatalog: true } } },
      orderBy: { date: "desc" },
    });

    return records.map((record: any) => this.mapToEntity(record));
  }

  async findUpcoming(
    userId: string,
    daysAhead = 30,
  ): Promise<UpcomingHealthTask[]> {
    const now = new Date();
    const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const healthRecordClient = prisma.healthRecord as any;
    const records = await healthRecordClient.findMany({
      where: {
        userId,
        nextDueDate: { gte: now, lte: future },
      },
      include: { animal: { include: { speciesCatalog: true } } },
      orderBy: { nextDueDate: "asc" },
    });

    return records
      .map((record: any): UpcomingHealthTask | null => {
        if (!record.nextDueDate) {
          return null;
        }

        const daysUntil = Math.ceil(
          (record.nextDueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        );

        return {
          id: record.id,
          animalId: record.animalId,
          animalCrotal: record.animal.crotal,
          type: record.type as HealthType,
          dueDate: record.nextDueDate,
          daysUntilDue: daysUntil,
          notes: record.notes ?? undefined,
        };
      })
      .filter((task: any): task is UpcomingHealthTask => task !== null);
  }

  async create(data: HealthRecordCreateInput): Promise<HealthRecord> {
    const record = await (prisma.healthRecord as any).create({
      data,
      include: { animal: { include: { speciesCatalog: true } } },
    });

    return this.mapToEntity(record);
  }

  async update(
    id: string,
    data: HealthRecordUpdateInput,
  ): Promise<HealthRecord> {
    const record = await (prisma.healthRecord as any).update({
      where: { id },
      data: { ...data, clientUpdatedAt: new Date(), syncVersion: { increment: 1 } },
      include: { animal: { include: { speciesCatalog: true } } },
    });

    return this.mapToEntity(record);
  }

  async delete(id: string): Promise<void> {
    await (prisma.healthRecord as any).delete({ where: { id } });
  }

  async findCompleted(userId: string): Promise<HealthRecord[]> {
    const records = await (prisma.healthRecord as any).findMany({
      where: { userId, completed: true },
      include: { animal: { include: { speciesCatalog: true } } },
      orderBy: { date: "desc" },
    });

    return records.map((record: any) => this.mapToEntity(record));
  }

  async findPending(userId: string): Promise<HealthRecord[]> {
    const records = await (prisma.healthRecord as any).findMany({
      where: { userId, completed: false },
      include: { animal: { include: { speciesCatalog: true } } },
      orderBy: { date: "asc" },
    });

    return records.map((record: any) => this.mapToEntity(record));
  }

  private mapToEntity(data: HealthRecordWithAnimal): HealthRecord {
    return {
      id: data.id,
      animalId: data.animalId,
      animal: data.animal ? this.mapAnimalToEntity(data.animal) : undefined,
      type: data.type as HealthType,
      date: data.date,
      notes: data.notes ?? undefined,
      nextDueDate: data.nextDueDate ?? undefined,
      completed: data.completed,
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
