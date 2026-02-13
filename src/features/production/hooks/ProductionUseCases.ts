import { DB_TABLES } from '@/infrastructure/database/constants';
import { extractApiErrorMessage } from '@/core/utils/apiErrorHandler';
import { ProductionApi } from '@/features/production/services/ProductionApi';
import { ProductionLocalRepository } from '@/features/production/services/ProductionLocalRepository';
import type {
  ProductionRecord,
  ProductionRecordCreateInput,
  ProductionRecordUpdateInput,
  ProductionSummary,
  ProductionType,
} from '@/features/production/interfaces/production.types';
import type { SyncOrchestrator } from '@/features/sync/hooks/SyncOrchestrator';
import { useNetworkStore } from '@/store/useNetworkStore';

interface ProductionFilters {
  animalId?: string;
  type?: ProductionType;
}

export class ProductionUseCases {
  constructor(
    private readonly api: ProductionApi,
    private readonly localRepository: ProductionLocalRepository,
    private readonly syncOrchestrator: SyncOrchestrator,
  ) {}

  async list(userId: string, refreshFromServer = false): Promise<ProductionRecord[]> {
    if (refreshFromServer) {
      await this.refreshFromServer();
    }
    return this.localRepository.listByUserId(userId);
  }

  async create(
    userId: string,
    input: ProductionRecordCreateInput,
  ): Promise<ProductionRecord> {
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
      DB_TABLES.productionRecords,
      'CREATE',
      localRecord.id,
      {
        animalId: localRecord.animalId,
        type: localRecord.type,
        date: localRecord.date,
        value: localRecord.value,
        unit: localRecord.unit,
        qualityScore: localRecord.qualityScore ?? undefined,
        notes: localRecord.notes ?? undefined,
      },
      localRecord.syncVersion,
    );
    return localRecord;
  }

  async update(
    productionRecordId: string,
    input: ProductionRecordUpdateInput,
  ): Promise<ProductionRecord | null> {
    const { isInitialized, isOnline } = useNetworkStore.getState();
    if (!isInitialized || isOnline) {
      try {
        const remoteRecord = await this.api.update(productionRecordId, input);
        await this.localRepository.upsertFromServer([remoteRecord]);
        return remoteRecord;
      } catch {
        // Fall back to local-first queue strategy when direct write fails.
      }
    }

    const updated = await this.localRepository.updateLocal(productionRecordId, input);
    if (!updated) return null;

    await this.syncOrchestrator.enqueueChange(
      DB_TABLES.productionRecords,
      'UPDATE',
      productionRecordId,
      input as Record<string, unknown>,
      updated.syncVersion,
    );

    return updated;
  }

  async delete(productionRecordId: string): Promise<boolean> {
    const { isInitialized, isOnline } = useNetworkStore.getState();
    if (!isInitialized || isOnline) {
      try {
        await this.api.delete(productionRecordId);
        await this.localRepository.deleteLocal(productionRecordId);
        return true;
      } catch {
        // Fall back to local-first queue strategy when direct write fails.
      }
    }

    const deletedVersion = await this.localRepository.deleteLocal(productionRecordId);
    if (!deletedVersion) return false;

    await this.syncOrchestrator.enqueueChange(
      DB_TABLES.productionRecords,
      'DELETE',
      productionRecordId,
      null,
      deletedVersion,
    );
    return true;
  }

  async getById(productionRecordId: string): Promise<ProductionRecord | null> {
    const localRecord = await this.localRepository.getById(productionRecordId);
    if (localRecord) return localRecord;

    try {
      const remoteRecord = await this.api.getById(productionRecordId);
      await this.localRepository.upsertFromServer([remoteRecord]);
      return remoteRecord;
    } catch {
      return null;
    }
  }

  async getByIdFromApi(
    productionRecordId: string,
  ): Promise<ProductionRecord | null> {
    try {
      const remoteRecord = await this.api.getById(productionRecordId);
      await this.localRepository.upsertFromServer([remoteRecord]);
      return remoteRecord;
    } catch {
      return null;
    }
  }

  async getFromApi(filters?: ProductionFilters): Promise<ProductionRecord[]> {
    const response = await this.api.getAll(filters);
    return response.records;
  }

  async getSummary(
    animalId: string,
    type: ProductionType,
  ): Promise<ProductionSummary> {
    const { isInitialized, isOnline } = useNetworkStore.getState();
    if (!isInitialized || isOnline) {
      try {
        return await this.api.getSummary(animalId, type);
      } catch {
        // Fall through to local fallback.
      }
    }

    const localRecords = await this.localRepository.listByAnimalAndType(animalId, type);
    if (localRecords.length === 0) {
      return {
        animalId,
        animalCrotal: animalId,
        type,
        totalRecords: 0,
        averageValue: 0,
        averageQualityScore: null,
        lastRecord: '',
        trend: 'stable',
      };
    }

    const values = localRecords.map(record => record.value);
    const averageValue = values.reduce((sum, value) => sum + value, 0) / values.length;

    const qualityScores = localRecords
      .map(record => record.qualityScore)
      .filter((score): score is number => score !== null);
    const averageQualityScore =
      qualityScores.length > 0
        ? qualityScores.reduce((sum, value) => sum + value, 0) / qualityScores.length
        : null;

    const chronologicallySorted = [...localRecords].sort((left, right) =>
      left.date.localeCompare(right.date),
    );
    const firstValue = chronologicallySorted[0]?.value ?? averageValue;
    const lastValue =
      chronologicallySorted[chronologicallySorted.length - 1]?.value ?? averageValue;
    const driftThreshold = Math.max(Math.abs(firstValue) * 0.03, 0.01);

    const trend: ProductionSummary['trend'] =
      Math.abs(lastValue - firstValue) <= driftThreshold
        ? 'stable'
        : lastValue > firstValue
          ? 'improving'
          : 'declining';

    return {
      animalId,
      animalCrotal: animalId,
      type,
      totalRecords: localRecords.length,
      averageValue,
      averageQualityScore,
      lastRecord: localRecords[0].date,
      trend,
    };
  }

  async getRecent(animalId: string, limit?: number): Promise<ProductionRecord[]> {
    const { isInitialized, isOnline } = useNetworkStore.getState();
    if (!isInitialized || isOnline) {
      try {
        const response = await this.api.getRecent(animalId, limit);
        return response.records;
      } catch {
        // Fall through to local fallback.
      }
    }

    const localRecords = await this.localRepository.listByAnimalId(animalId);
    return localRecords.slice(0, limit ?? 10);
  }

  private async refreshFromServer(): Promise<void> {
    try {
      const response = await this.api.getAll();
      await this.localRepository.upsertFromServer(response.records);
    } catch (error) {
      console.warn(
        'No se pudo refrescar producción',
        extractApiErrorMessage(error),
      );
    }
  }
}

