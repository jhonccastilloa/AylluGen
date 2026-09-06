import { HealthLocalRepository } from '@/features/health/services/HealthLocalRepository';
import type {
  HealthRecord,
  HealthRecordCreateInput,
  HealthRecordUpdateInput,
  HealthType,
} from '@/features/health/interfaces/health.types';

interface HealthUpcomingTask {
  id: string;
  animalId: string;
  animalCrotal: string;
  type: HealthType;
  dueDate: string;
  daysUntilDue: number;
  notes: string | null;
}

export class HealthUseCases {
  constructor(private readonly localRepository: HealthLocalRepository) {}

  async list(userId: string): Promise<HealthRecord[]> {
    return this.localRepository.listByUserId(userId);
  }

  async create(
    userId: string,
    input: HealthRecordCreateInput,
  ): Promise<HealthRecord> {
    const localRecord = await this.localRepository.createLocal(userId, input);

    return localRecord;
  }

  async update(
    healthRecordId: string,
    input: HealthRecordUpdateInput,
  ): Promise<HealthRecord | null> {
    const updatedRecord = await this.localRepository.updateLocal(
      healthRecordId,
      input,
    );
    if (!updatedRecord) return null;

    return updatedRecord;
  }

  async delete(healthRecordId: string): Promise<boolean> {
    const deletedVersion =
      await this.localRepository.deleteLocal(healthRecordId);
    if (!deletedVersion) return false;

    return true;
  }

  async getById(id: string): Promise<HealthRecord | null> {
    return this.localRepository.getById(id);
  }

  async getUpcoming(
    userId: string,
    daysAhead = 30,
  ): Promise<HealthUpcomingTask[]> {
    const localRecords = await this.localRepository.listUpcomingByUserId(
      userId,
      daysAhead,
    );
    const now = Date.now();

    return localRecords.map(record => {
      const dueTimestamp = Date.parse(record.nextDueDate ?? '');
      const safeDueTimestamp = Number.isNaN(dueTimestamp) ? now : dueTimestamp;
      const daysUntilDue = Math.max(
        0,
        Math.ceil((safeDueTimestamp - now) / (24 * 60 * 60 * 1000)),
      );

      return {
        id: record.id,
        animalId: record.animalId,
        animalCrotal: record.animalId,
        type: record.type,
        dueDate: record.nextDueDate ?? record.date,
        daysUntilDue,
        notes: record.notes,
      };
    });
  }
}
