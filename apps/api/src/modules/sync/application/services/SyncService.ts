import { injectable, inject } from "inversify";
import { ISyncRepository } from "../../domain/repositories/ISyncRepository";
import { TYPES } from "../../../../shared/di/types";
import {
  NotFoundError,
  ValidationError,
} from "../../../../shared/errors/AppError";
import { prisma } from "../../../../infrastructure/database/prisma/client";
import { SyncPullInput, SyncPushInput } from "../schemas/sync.schema";
import { SpeciesService } from "../../../species/application/services/SpeciesService";

@injectable()
export class SyncService {
  constructor(
    @inject(TYPES.ISyncRepository) private syncRepository: ISyncRepository,
    @inject(TYPES.SpeciesService) private speciesService: SpeciesService,
  ) {}

  async pushChanges(data: SyncPushInput): Promise<any> {
    const conflicts: any[] = [];
    const errors: any[] = [];
    let syncedChanges = 0;

    for (const change of data.changes) {
      try {
        const result = await this.processChange(data.userId, change);
        if (result.conflict) {
          conflicts.push({
            tableName: change.tableName,
            recordId: change.recordId,
            serverVersion: result.serverVersion,
            clientVersion: change.data,
          });
        } else {
          syncedChanges++;
        }
      } catch (error) {
        errors.push({
          tableName: change.tableName,
          recordId: change.recordId,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    await this.syncRepository.saveLatestSync(data.userId, new Date());

    return {
      success: errors.length === 0,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      errors: errors.length > 0 ? errors : undefined,
      syncedChanges,
    };
  }

  async pullChanges(data: SyncPullInput): Promise<any> {
    const lastSyncAt = data.lastSyncAt ? new Date(data.lastSyncAt) : undefined;

    const result: any = {
      syncTimestamp: new Date().toISOString(),
    };

    for (const table of data.tables) {
      const records = await this.fetchTableData(data.userId, table, lastSyncAt);
      result[this.camelCase(table)] = records;
    }

    return result;
  }

  async resolveConflict(
    tableName: string,
    recordId: string,
    resolution: string,
    userId: string,
  ): Promise<void> {
    if (resolution === "server") {
      const record = await this.getPrismaTable(tableName).findUnique({
        where: { id: recordId },
      });

      if (!record) {
        throw new NotFoundError("Record not found");
      }
      if (record.userId !== userId)
        throw new ValidationError("Record not available");

      await this.getPrismaTable(tableName).update({
        where: { id: recordId },
        data: { syncStatus: "SYNCED" },
      });
    } else {
      await this.syncRepository.deleteLogs(userId, new Date());
    }
  }

  private async processChange(
    userId: string,
    change: any,
  ): Promise<{ conflict: boolean; serverVersion?: any }> {
    const table = this.getPrismaTable(change.tableName);

    if (change.action === "DELETE") {
      const record = await table.findUnique({ where: { id: change.recordId } });

      if (!record) {
        return { conflict: false };
      }

      if (record.userId !== userId) {
        throw new ValidationError(
          "You do not have permission to delete this record",
        );
      }

      if (change.tableName === "animals") {
        await table.update({
          where: { id: change.recordId },
          data: { deletedAt: new Date(), syncStatus: "DELETED" },
        });
      } else {
        await table.delete({ where: { id: change.recordId } });
      }

      return { conflict: false };
    }

    if (change.action === "CREATE") {
      const existing = await table.findUnique({
        where: { id: change.recordId },
      });

      if (existing) {
        if (existing.userId !== userId)
          throw new ValidationError("Record not available");
        return { conflict: true, serverVersion: existing };
      }

      let createData = this.transformForCreate(change.data);
      if (change.tableName === "animals") {
        createData = await this.normalizeAnimalPayloadForPersistence(
          userId,
          createData,
        );
      }
      await table.create({
        data: { ...createData, id: change.recordId, userId },
      });

      return { conflict: false };
    }

    if (change.action === "UPDATE") {
      const record = await table.findUnique({ where: { id: change.recordId } });

      if (!record) {
        return { conflict: true, serverVersion: null };
      }

      if (record.userId !== userId) {
        throw new ValidationError(
          "You do not have permission to update this record",
        );
      }

      if (record.syncVersion > change.clientVersion) {
        return { conflict: true, serverVersion: record };
      }

      let updateData = this.transformForUpdate(change.data);
      if (
        change.tableName === "animals" &&
        ["speciesId", "speciesCode", "species"].some((key) => key in updateData)
      ) {
        updateData = await this.normalizeAnimalPayloadForPersistence(
          userId,
          updateData,
        );
      }
      await table.update({
        where: { id: change.recordId },
        data: {
          ...updateData,
          syncVersion: { increment: 1 },
          syncStatus: "SYNCED",
        },
      });

      return { conflict: false };
    }

    return { conflict: false };
  }

  private async fetchTableData(
    userId: string,
    tableName: string,
    lastSyncAt?: Date,
  ): Promise<any[]> {
    const whereClause: any = { userId };

    if (lastSyncAt) {
      whereClause.updatedAt = { gte: lastSyncAt };
    }

    if (tableName === "animals") {
      const records = await (prisma.animal as any).findMany({
        where: whereClause,
        include: { speciesCatalog: true },
        orderBy: { updatedAt: "asc" },
      });

      return records.map((record: any) => ({
        ...record,
        species: record.speciesCatalog?.code ?? null,
        speciesName: record.speciesCatalog?.name ?? null,
      }));
    }

    const table = this.getPrismaTable(tableName);
    const records = await table.findMany({
      where: whereClause,
      orderBy: { updatedAt: "asc" },
    });

    return records;
  }

  private getPrismaTable(tableName: string): any {
    switch (tableName) {
      case "animals":
        return prisma.animal;
      case "breedings":
        return prisma.breeding;
      case "health_records":
        return prisma.healthRecord;
      case "production_records":
        return prisma.productionRecord;
      default:
        throw new ValidationError(`Unknown table: ${tableName}`);
    }
  }

  private transformForCreate(data: any): any {
    this.validateLegacyColumns(data);
    const result: any = {};

    for (const key in data) {
      if (
        ![
          "id",
          "userId",
          "createdAt",
          "updatedAt",
          "syncStatus",
          "syncVersion",
        ].includes(key)
      ) {
        if (
          ["clientCreatedAt", "clientUpdatedAt"].includes(key) &&
          (typeof data[key] !== "string" ||
            !/^\d{4}-\d{2}-\d{2}T/.test(data[key]) ||
            !this.isDateString(data[key]))
        ) {
          throw new ValidationError(`Invalid ${key}`);
        }
        if (
          [
            "birthDate",
            "breedingDate",
            "date",
            "nextDueDate",
            "deletedAt",
            "clientCreatedAt",
            "clientUpdatedAt",
          ].includes(key) &&
          typeof data[key] === "string" &&
          this.isDateString(data[key])
        ) {
          result[key] = new Date(data[key]);
        } else {
          result[key] = data[key];
        }
      }
    }

    return result;
  }

  private transformForUpdate(data: any): any {
    this.validateLegacyColumns(data);
    // Legacy clients have no action date; use reception time as a fallback.
    const result: any = { clientUpdatedAt: new Date() };

    for (const key in data) {
      if (
        ![
          "id",
          "userId",
          "createdAt",
          "updatedAt",
          "clientCreatedAt",
          "syncStatus",
          "syncVersion",
        ].includes(key)
      ) {
        if (
          key === "clientUpdatedAt" &&
          (typeof data[key] !== "string" ||
            !/^\d{4}-\d{2}-\d{2}T/.test(data[key]) ||
            !this.isDateString(data[key]))
        ) {
          throw new ValidationError(`Invalid ${key}`);
        }
        if (
          [
            "birthDate",
            "breedingDate",
            "date",
            "nextDueDate",
            "deletedAt",
            "clientUpdatedAt",
          ].includes(key) &&
          typeof data[key] === "string" &&
          this.isDateString(data[key])
        ) {
          result[key] = new Date(data[key]);
        } else {
          result[key] = data[key];
        }
      }
    }

    return result;
  }

  private async normalizeAnimalPayloadForPersistence(
    userId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const speciesIdRaw = data.speciesId;
    const speciesCodeRaw = data.speciesCode ?? data.species;

    const resolvedSpecies = await this.speciesService.resolveSpeciesForAnimal(
      userId,
      {
        speciesId:
          typeof speciesIdRaw === "string" && speciesIdRaw.trim().length > 0
            ? speciesIdRaw
            : undefined,
        speciesCode:
          typeof speciesCodeRaw === "string" && speciesCodeRaw.trim().length > 0
            ? speciesCodeRaw
            : undefined,
      },
    );

    const normalizedData: Record<string, unknown> = {
      ...data,
      speciesId: resolvedSpecies.speciesId,
    };
    delete normalizedData.species;
    delete normalizedData.speciesCode;
    delete normalizedData.speciesName;

    return normalizedData;
  }

  private isDateString(str: string): boolean {
    return !isNaN(Date.parse(str));
  }

  private validateLegacyColumns(data: unknown): void {
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new ValidationError("Invalid record");
    const allowed = new Set([
      "id",
      "userId",
      "createdAt",
      "updatedAt",
      "syncStatus",
      "syncVersion",
      "clientCreatedAt",
      "clientUpdatedAt",
      "crotal",
      "sex",
      "speciesId",
      "speciesCode",
      "species",
      "speciesName",
      "birthDate",
      "isFounder",
      "fatherId",
      "motherId",
      "maleId",
      "femaleId",
      "projectedCOI",
      "riskLevel",
      "offspringId",
      "breedingDate",
      "notes",
      "animalId",
      "type",
      "date",
      "nextDueDate",
      "completed",
      "value",
      "unit",
      "qualityScore",
      "deletedAt",
    ]);
    if (Object.keys(data).some((column) => !allowed.has(column)))
      throw new ValidationError("Column not allowed");
  }

  private camelCase(str: string): string {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  }
}
