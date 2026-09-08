import { injectable, inject } from "inversify";
import { IHealthRecordRepository } from "../../domain/repositories/IHealthRecordRepository";
import { IAnimalRepository } from "../../../animal/domain/repositories/IAnimalRepository";
import { TYPES } from "../../../../shared/di/types";
import {
  HealthRecordCreateInput,
  HealthRecordResponse,
  HealthRecordUpdateInput as HealthRecordUpdateSchemaInput,
  UpcomingTaskResponse,
} from "../schemas/health.schema";
import {
  NotFoundError,
  ValidationError,
} from "../../../../shared/errors/AppError";
import {
  HealthRecord,
  HealthRecordUpdateInput as HealthRecordUpdateEntityInput,
  HealthType,
} from "../../domain/entities/HealthRecord";

@injectable()
export class HealthRecordService {
  constructor(
    @inject(TYPES.IHealthRecordRepository)
    private healthRecordRepository: IHealthRecordRepository,
    @inject(TYPES.IAnimalRepository)
    private animalRepository: IAnimalRepository,
  ) {}

  async create(
    userId: string,
    data: HealthRecordCreateInput,
  ): Promise<HealthRecordResponse> {
    const animal = await this.animalRepository.findById(data.animalId);
    if (!animal) {
      throw new NotFoundError("Animal not found");
    }

    if (animal.userId !== userId) {
      throw new ValidationError(
        "You do not have permission to access this animal",
      );
    }

    const record = await this.healthRecordRepository.create({
      ...data,
      userId,
      date: new Date(data.date),
      nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : undefined,
    });

    return this.mapToResponse(record);
  }

  async update(
    id: string,
    userId: string,
    data: HealthRecordUpdateSchemaInput,
  ): Promise<HealthRecordResponse> {
    const record = await this.healthRecordRepository.findById(id);
    if (!record) {
      throw new NotFoundError("Health record not found");
    }

    if (record.userId !== userId) {
      throw new ValidationError(
        "You do not have permission to update this health record",
      );
    }

    const updateData: HealthRecordUpdateEntityInput = {
      ...data,
      date: data.date ? new Date(data.date) : undefined,
      nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : undefined,
    };

    const updated = await this.healthRecordRepository.update(id, updateData);

    return this.mapToResponse(updated);
  }

  async delete(id: string, userId: string): Promise<void> {
    const record = await this.healthRecordRepository.findById(id);
    if (!record) {
      throw new NotFoundError("Health record not found");
    }

    if (record.userId !== userId) {
      throw new ValidationError(
        "You do not have permission to delete this health record",
      );
    }

    await this.healthRecordRepository.delete(id);
  }

  async getById(id: string, userId: string): Promise<HealthRecordResponse> {
    const record = await this.healthRecordRepository.findById(id);
    if (!record) {
      throw new NotFoundError("Health record not found");
    }

    if (record.userId !== userId) {
      throw new ValidationError(
        "You do not have permission to view this health record",
      );
    }

    return this.mapToResponse(record);
  }

  async getAll(
    userId: string,
    animalId?: string,
    type?: HealthType,
    completed?: boolean,
  ): Promise<{ records: HealthRecordResponse[] }> {
    if (animalId) {
      const animal = await this.animalRepository.findById(animalId);
      if (!animal || animal.userId !== userId) {
        throw new ValidationError(
          "You do not have permission to view these health records",
        );
      }
      const records = await this.healthRecordRepository.findByAnimalId(animalId);
      return { records: records.map((record) => this.mapToResponse(record)) };
    }

    if (type) {
      const records = await this.healthRecordRepository.findByType(userId, type);
      return { records: records.map((record) => this.mapToResponse(record)) };
    }

    if (completed !== undefined) {
      const records = completed
        ? await this.healthRecordRepository.findCompleted(userId)
        : await this.healthRecordRepository.findPending(userId);
      return { records: records.map((record) => this.mapToResponse(record)) };
    }

    const records = await this.healthRecordRepository.findAllByUserId(userId);
    return { records: records.map((record) => this.mapToResponse(record)) };
  }

  async getUpcomingTasks(
    userId: string,
    daysAhead?: number,
  ): Promise<{ tasks: UpcomingTaskResponse[] }> {
    const tasks = await this.healthRecordRepository.findUpcoming(userId, daysAhead);
    return {
      tasks: tasks.map((task) => ({
        id: task.id,
        animalId: task.animalId,
        animalCrotal: task.animalCrotal,
        type: task.type,
        dueDate: task.dueDate.toISOString(),
        daysUntilDue: task.daysUntilDue,
        notes: task.notes ?? null,
      })),
    };
  }

  private mapToResponse(record: HealthRecord): HealthRecordResponse {
    return {
      id: record.id,
      animalId: record.animalId,
      animal: record.animal
        ? {
            id: record.animal.id,
            crotal: record.animal.crotal,
            sex: record.animal.sex,
            speciesId: record.animal.speciesId,
            species: record.animal.species,
            speciesName: record.animal.speciesName ?? null,
            birthDate: record.animal.birthDate?.toISOString() || null,
            isFounder: record.animal.isFounder,
          }
        : null,
      type: record.type,
      date: record.date.toISOString(),
      notes: record.notes || null,
      nextDueDate: record.nextDueDate?.toISOString() || null,
      completed: record.completed,
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
