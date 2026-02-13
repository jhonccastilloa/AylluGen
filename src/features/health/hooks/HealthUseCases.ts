import { DB_TABLES } from '@/infrastructure/database/constants';
import { extractApiErrorMessage } from '@/core/utils/apiErrorHandler';
import { HealthApi } from '@/features/health/services/HealthApi';
import { HealthLocalRepository } from '@/features/health/services/HealthLocalRepository';
import type {
  HealthRecord,
  HealthRecordCreateInput,
  HealthRecordUpdateInput,
  HealthType,
} from '@/features/health/interfaces/health.types';
import type { SyncOrchestrator } from '@/features/sync/hooks/SyncOrchestrator';
import { useNetworkStore } from '@/store/useNetworkStore';

interface HealthListFilters {
  animalId?: string;
  type?: HealthType;
  completed?: boolean;
}

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
  constructor(
    private readonly api: HealthApi,
    private readonly localRepository: HealthLocalRepository,
    private readonly syncOrchestrator: SyncOrchestrator,
  ) {}

  async list(userId: string, refreshFromServer = false): Promise<HealthRecord[]> {
    if (refreshFromServer) {
      await this.refreshFromServer();
    }
    return this.localRepository.listByUserId(userId);
  }

  async create(userId: string, input: HealthRecordCreateInput): Promise<HealthRecord> {
    const { isInitialized, isOnline } = useNetworkStore.getState();
    if (!isInitialized || isOnline) {
      try {
        const remoteRecord = await this.api.create(input);
        await this.localRepository.upsertFromServer([remoteRecord]);
        return remoteRecord;
      } catch {
        // Fall back to local-first queue strategy when direct write fails.
      }
    }

    const localRecord = await this.localRepository.createLocal(userId, input);

    await this.syncOrchestrator.enqueueChange(
      DB_TABLES.healthRecords,
      'CREATE',
      localRecord.id,
      {
        animalId: localRecord.animalId,
        type: localRecord.type,
        date: localRecord.date,
        notes: localRecord.notes ?? undefined,
        nextDueDate: localRecord.nextDueDate ?? undefined,
        completed: localRecord.completed,
      },
      localRecord.syncVersion,
    );

    return localRecord;
  }

  async update(
    healthRecordId: string,
    input: HealthRecordUpdateInput,
  ): Promise<HealthRecord | null> {
    const { isInitialized, isOnline } = useNetworkStore.getState();
    if (!isInitialized || isOnline) {
      try {
        const remoteRecord = await this.api.update(healthRecordId, input);
        await this.localRepository.upsertFromServer([remoteRecord]);
        return remoteRecord;
      } catch {
        // Fall back to local-first queue strategy when direct write fails.
      }
    }

    const updatedRecord = await this.localRepository.updateLocal(healthRecordId, input);
    if (!updatedRecord) return null;

    await this.syncOrchestrator.enqueueChange(
      DB_TABLES.healthRecords,
      'UPDATE',
      healthRecordId,
      input as Record<string, unknown>,
      updatedRecord.syncVersion,
    );

    return updatedRecord;
  }

  async delete(healthRecordId: string): Promise<boolean> {
    const { isInitialized, isOnline } = useNetworkStore.getState();
    if (!isInitialized || isOnline) {
      try {
        await this.api.delete(healthRecordId);
        await this.localRepository.deleteLocal(healthRecordId);
        return true;
      } catch {
        // Fall back to local-first queue strategy when direct write fails.
      }
    }

    const deletedVersion = await this.localRepository.deleteLocal(healthRecordId);
    if (!deletedVersion) return false;

    await this.syncOrchestrator.enqueueChange(
      DB_TABLES.healthRecords,
      'DELETE',
      healthRecordId,
      null,
      deletedVersion,
    );
    return true;
  }

  async getById(healthRecordId: string): Promise<HealthRecord | null> {
    const localRecord = await this.localRepository.getById(healthRecordId);
    if (localRecord) return localRecord;

    try {
      const remoteRecord = await this.api.getById(healthRecordId);
      await this.localRepository.upsertFromServer([remoteRecord]);
      return remoteRecord;
    } catch {
      return null;
    }
  }

  async getByIdFromApi(healthRecordId: string): Promise<HealthRecord | null> {
    try {
      const remoteRecord = await this.api.getById(healthRecordId);
      await this.localRepository.upsertFromServer([remoteRecord]);
      return remoteRecord;
    } catch {
      return null;
    }
  }

  async getFromApi(filters?: HealthListFilters): Promise<HealthRecord[]> {
    const response = await this.api.getAll(filters);
    return response.records;
  }

  async getUpcoming(userId: string, daysAhead = 30): Promise<HealthUpcomingTask[]> {
    const { isInitialized, isOnline } = useNetworkStore.getState();

    if (!isInitialized || isOnline) {
      try {
        const response = await this.api.getUpcoming(daysAhead);
        return response.tasks;
      } catch {
        // Fall through to local fallback.
      }
    }

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

  private async refreshFromServer(): Promise<void> {
    try {
      const response = await this.api.getAll();
      await this.localRepository.upsertFromServer(response.records);
    } catch (error) {
      console.warn(
        'No se pudo refrescar registros de salud',
        extractApiErrorMessage(error),
      );
    }
  }
}

