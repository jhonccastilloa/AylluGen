import { DB_TABLES } from '@/infrastructure/database/constants';
import { extractApiErrorMessage } from '@/core/utils/apiErrorHandler';
import { AnimalsApi, type AnimalQueryParams } from '@/features/animals/services/AnimalsApi';
import {
  AnimalsLocalRepository,
  type AnimalsFilter,
} from '@/features/animals/services/AnimalsLocalRepository';
import type {
  Animal,
  AnimalCreateInput,
  AnimalUpdateInput,
} from '@/features/animals/interfaces/animals.types';
import type { SyncOrchestrator } from '@/features/sync/hooks/SyncOrchestrator';
import { useNetworkStore } from '@/store/useNetworkStore';

interface ListInventoryOptions {
  refreshFromServer?: boolean;
}

export class AnimalsUseCases {
  constructor(
    private readonly api: AnimalsApi,
    private readonly localRepository: AnimalsLocalRepository,
    private readonly syncOrchestrator: SyncOrchestrator,
  ) {}

  async listInventory(
    userId: string,
    filter?: AnimalsFilter,
    options?: ListInventoryOptions,
  ): Promise<Animal[]> {
    if (options?.refreshFromServer) {
      await this.refreshAllFromServer();
    }
    return this.localRepository.listByUserId(userId, filter);
  }

  async getById(animalId: string): Promise<Animal | null> {
    const localAnimal = await this.localRepository.getById(animalId);
    if (localAnimal) return localAnimal;

    try {
      const remoteAnimal = await this.api.getById(animalId);
      await this.localRepository.upsertFromServer([remoteAnimal]);
      return remoteAnimal;
    } catch {
      return null;
    }
  }

  async getByIdFromApi(animalId: string): Promise<Animal | null> {
    try {
      const remoteAnimal = await this.api.getById(animalId);
      await this.localRepository.upsertFromServer([remoteAnimal]);
      return remoteAnimal;
    } catch {
      return null;
    }
  }

  async registerAnimal(userId: string, input: AnimalCreateInput): Promise<Animal> {
    const { isInitialized, isOnline } = useNetworkStore.getState();
    if (!isInitialized || isOnline) {
      try {
        const remoteAnimal = await this.api.create(input);
        await this.localRepository.upsertFromServer([remoteAnimal]);
        return remoteAnimal;
      } catch {
        // Fall back to local-first queue strategy when direct write fails.
      }
    }

    const localAnimal = await this.localRepository.createLocal(userId, input);

    await this.syncOrchestrator.enqueueChange(
      DB_TABLES.animals,
      'CREATE',
      localAnimal.id,
      {
        crotal: localAnimal.crotal,
        sex: localAnimal.sex,
        speciesId: localAnimal.speciesId ?? undefined,
        speciesCode: localAnimal.species,
        birthDate: localAnimal.birthDate ?? undefined,
        isFounder: localAnimal.isFounder,
        fatherId: localAnimal.fatherId ?? undefined,
        motherId: localAnimal.motherId ?? undefined,
      },
      localAnimal.syncVersion,
    );

    return localAnimal;
  }

  async updateAnimal(
    animalId: string,
    input: AnimalUpdateInput,
  ): Promise<Animal | null> {
    const { isInitialized, isOnline } = useNetworkStore.getState();
    if (!isInitialized || isOnline) {
      try {
        const remoteAnimal = await this.api.update(animalId, input);
        await this.localRepository.upsertFromServer([remoteAnimal]);
        return remoteAnimal;
      } catch {
        // Fall back to local-first queue strategy when direct write fails.
      }
    }

    const updatedAnimal = await this.localRepository.updateLocal(animalId, input);
    if (!updatedAnimal) return null;

    await this.syncOrchestrator.enqueueChange(
      DB_TABLES.animals,
      'UPDATE',
      animalId,
      input as Record<string, unknown>,
      updatedAnimal.syncVersion,
    );

    return updatedAnimal;
  }

  async deleteAnimal(animalId: string): Promise<boolean> {
    const { isInitialized, isOnline } = useNetworkStore.getState();
    if (!isInitialized || isOnline) {
      try {
        await this.api.delete(animalId);
        await this.localRepository.softDeleteLocal(animalId);
        return true;
      } catch {
        // Fall back to local-first queue strategy when direct write fails.
      }
    }

    const deletedVersion = await this.localRepository.softDeleteLocal(animalId);
    if (!deletedVersion) return false;

    await this.syncOrchestrator.enqueueChange(
      DB_TABLES.animals,
      'DELETE',
      animalId,
      null,
      deletedVersion,
    );

    return true;
  }

  async getFounders(userId: string): Promise<Animal[]> {
    await this.refreshFoundersFromServer();
    return this.localRepository.getFounders(userId);
  }

  async getMales(userId: string): Promise<Animal[]> {
    await this.refreshMalesFromServer();
    return this.localRepository.getMales(userId);
  }

  async getFemales(userId: string): Promise<Animal[]> {
    await this.refreshFemalesFromServer();
    return this.localRepository.getFemales(userId);
  }

  async getPedigree(animalId: string): Promise<Animal | null> {
    try {
      return await this.api.getPedigree(animalId);
    } catch {
      return null;
    }
  }

  async fetchFromApi(query?: AnimalQueryParams): Promise<Animal[]> {
    const response = await this.api.getAll(query);
    return response.animals;
  }

  private async refreshAllFromServer(): Promise<void> {
    try {
      const response = await this.api.getAll({ limit: 500, offset: 0 });
      await this.localRepository.upsertFromServer(response.animals);
    } catch (error) {
      console.warn('No se pudo refrescar animales', extractApiErrorMessage(error));
    }
  }

  private async refreshFoundersFromServer(): Promise<void> {
    try {
      const founders = await this.api.getFounders();
      await this.localRepository.upsertFromServer(founders);
    } catch (error) {
      console.warn('No se pudo refrescar fundadores', extractApiErrorMessage(error));
    }
  }

  private async refreshMalesFromServer(): Promise<void> {
    try {
      const males = await this.api.getMales();
      await this.localRepository.upsertFromServer(males);
    } catch (error) {
      console.warn('No se pudo refrescar machos', extractApiErrorMessage(error));
    }
  }

  private async refreshFemalesFromServer(): Promise<void> {
    try {
      const females = await this.api.getFemales();
      await this.localRepository.upsertFromServer(females);
    } catch (error) {
      console.warn('No se pudo refrescar hembras', extractApiErrorMessage(error));
    }
  }
}

