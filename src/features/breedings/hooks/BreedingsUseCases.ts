import { DB_TABLES } from '@/infrastructure/database/constants';
import { extractApiErrorMessage } from '@/core/utils/apiErrorHandler';
import { BreedingsApi } from '@/features/breedings/services/BreedingsApi';
import { BreedingsLocalRepository } from '@/features/breedings/services/BreedingsLocalRepository';
import type {
  Breeding,
  BreedingCreateInput,
  BreedingMatchInput,
  BreedingUpdateInput,
  CoiCalculationResponse,
} from '@/features/breedings/interfaces/breedings.types';
import type { SyncOrchestrator } from '@/features/sync/hooks/SyncOrchestrator';
import { useNetworkStore } from '@/store/useNetworkStore';

interface ListOptions {
  refreshFromServer?: boolean;
}

export class BreedingsUseCases {
  constructor(
    private readonly api: BreedingsApi,
    private readonly localRepository: BreedingsLocalRepository,
    private readonly syncOrchestrator: SyncOrchestrator,
  ) {}

  async list(userId: string, options?: ListOptions): Promise<Breeding[]> {
    if (options?.refreshFromServer) {
      await this.refreshFromServer();
    }
    return this.localRepository.listByUserId(userId);
  }

  async calculateMatch(input: BreedingMatchInput): Promise<CoiCalculationResponse> {
    return this.api.calculateCoi(input);
  }

  async createBreeding(userId: string, input: BreedingCreateInput): Promise<Breeding> {
    const { isInitialized, isOnline } = useNetworkStore.getState();
    if (!isInitialized || isOnline) {
      try {
        const remoteBreeding = await this.api.create(input);
        await this.localRepository.upsertFromServer([remoteBreeding]);
        return remoteBreeding;
      } catch {
        // Fall back to local-first queue strategy when direct write fails.
      }
    }

    const localBreeding = await this.localRepository.createLocal(userId, input);

    await this.syncOrchestrator.enqueueChange(
      DB_TABLES.breedings,
      'CREATE',
      localBreeding.id,
      {
        maleId: localBreeding.maleId,
        femaleId: localBreeding.femaleId,
        projectedCOI: localBreeding.projectedCOI,
        riskLevel: localBreeding.riskLevel,
        breedingDate: localBreeding.breedingDate ?? undefined,
        notes: localBreeding.notes ?? undefined,
      },
      localBreeding.syncVersion,
    );

    return localBreeding;
  }

  async updateBreeding(
    breedingId: string,
    input: BreedingUpdateInput,
  ): Promise<Breeding | null> {
    const { isInitialized, isOnline } = useNetworkStore.getState();
    if (!isInitialized || isOnline) {
      try {
        const remoteBreeding = await this.api.update(breedingId, input);
        await this.localRepository.upsertFromServer([remoteBreeding]);
        return remoteBreeding;
      } catch {
        // Fall back to local-first queue strategy when direct write fails.
      }
    }

    const updated = await this.localRepository.updateLocal(breedingId, input);
    if (!updated) return null;

    await this.syncOrchestrator.enqueueChange(
      DB_TABLES.breedings,
      'UPDATE',
      breedingId,
      input as Record<string, unknown>,
      updated.syncVersion,
    );

    return updated;
  }

  async deleteBreeding(breedingId: string): Promise<boolean> {
    const { isInitialized, isOnline } = useNetworkStore.getState();
    if (!isInitialized || isOnline) {
      try {
        await this.api.delete(breedingId);
        await this.localRepository.deleteLocal(breedingId);
        return true;
      } catch {
        // Fall back to local-first queue strategy when direct write fails.
      }
    }

    const deletedVersion = await this.localRepository.deleteLocal(breedingId);
    if (!deletedVersion) return false;

    await this.syncOrchestrator.enqueueChange(
      DB_TABLES.breedings,
      'DELETE',
      breedingId,
      null,
      deletedVersion,
    );
    return true;
  }

  async getById(breedingId: string): Promise<Breeding | null> {
    const localBreeding = await this.localRepository.getById(breedingId);
    if (localBreeding) return localBreeding;

    try {
      const remoteBreeding = await this.api.getById(breedingId);
      await this.localRepository.upsertFromServer([remoteBreeding]);
      return remoteBreeding;
    } catch {
      return null;
    }
  }

  async getByIdFromApi(breedingId: string): Promise<Breeding | null> {
    try {
      const remoteBreeding = await this.api.getById(breedingId);
      await this.localRepository.upsertFromServer([remoteBreeding]);
      return remoteBreeding;
    } catch {
      return null;
    }
  }

  async getHistory(animalId: string, userId?: string): Promise<Breeding[]> {
    const { isInitialized, isOnline } = useNetworkStore.getState();
    if (!isInitialized || isOnline) {
      try {
        const response = await this.api.getHistory(animalId);
        return response.breedings;
      } catch {
        // Fall through to local fallback.
      }
    }

    if (!userId) return [];
    return this.localRepository.listByAnimalId(userId, animalId);
  }

  private async refreshFromServer(): Promise<void> {
    try {
      const response = await this.api.getAll();
      await this.localRepository.upsertFromServer(response.breedings);
    } catch (error) {
      console.warn('No se pudo refrescar cruces', extractApiErrorMessage(error));
    }
  }
}

