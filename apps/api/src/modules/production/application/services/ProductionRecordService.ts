import { injectable, inject } from "inversify";
import { IProductionRecordRepository } from "../../domain/repositories/IProductionRecordRepository";
import { IAnimalRepository } from "../../../animal/domain/repositories/IAnimalRepository";
import { TYPES } from "../../../../shared/di/types";
import {
  ProductionRecordCreateInput,
  ProductionRecordUpdateInput,
} from "../schemas/production.schema";
import {
  NotFoundError,
  ValidationError,
} from "../../../../shared/errors/AppError";
import { ProductionType } from "../../domain/entities/ProductionRecord";

@injectable()
export class ProductionRecordService {
  constructor(
    @inject(TYPES.IProductionRecordRepository)
    private productionRecordRepository: IProductionRecordRepository,
    @inject(TYPES.IAnimalRepository)
    private animalRepository: IAnimalRepository,
  ) {}

  async create(
    userId: string,
    data: ProductionRecordCreateInput,
  ): Promise<any> {
    const animal = await this.animalRepository.findById(data.animalId);
    if (!animal) {
      throw new NotFoundError("Animal not found");
    }

    if (animal.userId !== userId) {
      throw new ValidationError(
        "You do not have permission to access this animal",
      );
    }

    const record = await this.productionRecordRepository.create({
      ...data,
      userId,
      date: new Date(data.date),
    });

    return this.mapToResponse(record);
  }
  async getAll(
    userId: string,
    animalId?: string,
    type?: ProductionType,
  ): Promise<{ records: any[] }> {
    if (animalId) {
      const animal = await this.animalRepository.findById(animalId);
      if (!animal || animal.userId !== userId) {
        throw new ValidationError(
          "You do not have permission to view these production records",
        );
      }
      const records =
        await this.productionRecordRepository.findByAnimalId(animalId);
      return { records: records.map((r) => this.mapToResponse(r)) };
    }

    if (type) {
      const records = await this.productionRecordRepository.findByType(
        userId,
        type,
      );
      return { records: records.map((r) => this.mapToResponse(r)) };
    }

    const records =
      await this.productionRecordRepository.findAllByUserId(userId);
    return { records: records.map((r) => this.mapToResponse(r)) };
  }

  async getById(id: string, userId: string): Promise<any> {
    const record = await this.productionRecordRepository.findById(id);
    if (!record) {
      throw new NotFoundError("Production record not found");
    }

    if (record.userId !== userId) {
      throw new ValidationError(
        "You do not have permission to view this production record",
      );
    }

    return this.mapToResponse(record);
  }
  async getSummary(
    animalId: string,
    userId: string,
    type: ProductionType,
  ): Promise<any> {
    const animal = await this.animalRepository.findById(animalId);
    if (!animal) {
      throw new NotFoundError("Animal not found");
    }

    if (animal.userId !== userId) {
      throw new ValidationError(
        "You do not have permission to view this production summary",
      );
    }

    const summary = await this.productionRecordRepository.calculateSummary(
      animalId,
      type,
    );
    if (!summary) {
      return {
        animalId,
        animalCrotal: animal.crotal,
        type,
        totalRecords: 0,
        averageValue: 0,
        averageQualityScore: null,
        lastRecord: "",
        trend: "stable",
      };
    }

    return {
      ...summary,
      lastRecord: summary.lastRecord.toISOString(),
    };
  }

  async getRecent(
    animalId: string,
    userId: string,
    limit = 10,
  ): Promise<{ records: any[] }> {
    const animal = await this.animalRepository.findById(animalId);
    if (!animal || animal.userId !== userId) {
      throw new ValidationError(
        "You do not have permission to view these production records",
      );
    }

    const records = await this.productionRecordRepository.findRecentByAnimal(
      animalId,
      limit,
    );
    return { records: records.map((r) => this.mapToResponse(r)) };
  }
  async update(
    id: string,
    userId: string,
    data: ProductionRecordUpdateInput,
  ): Promise<any> {
    const record = await this.productionRecordRepository.findById(id);
    if (!record) {
      throw new NotFoundError("Production record not found");
    }

    if (record.userId !== userId) {
      throw new ValidationError(
        "You do not have permission to update this production record",
      );
    }

    const updateData: any = { ...data };
    if (data.date !== undefined && data.date !== null && data.date !== "") {
      updateData.date = new Date(data.date);
    }

    const updated = await this.productionRecordRepository.update(
      id,
      updateData,
    );

    return this.mapToResponse(updated);
  }

  async delete(id: string, userId: string): Promise<void> {
    const record = await this.productionRecordRepository.findById(id);
    if (!record) {
      throw new NotFoundError("Production record not found");
    }

    if (record.userId !== userId) {
      throw new ValidationError(
        "You do not have permission to delete this production record",
      );
    }

    await this.productionRecordRepository.delete(id);
  }

  private mapToResponse(record: any): any {
    return {
      id: record.id,
      animalId: record.animalId,
      animal: record.animal,
      type: record.type,
      date: record.date.toISOString(),
      value: record.value,
      unit: record.unit,
      qualityScore: record.qualityScore || null,
      notes: record.notes || null,
      userId: record.userId,
      syncStatus: record.syncStatus,
      syncVersion: record.syncVersion,
      clientCreatedAt: (record.clientCreatedAt ?? record.createdAt).toISOString(),
      clientUpdatedAt: (record.clientUpdatedAt ?? record.updatedAt).toISOString(),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
