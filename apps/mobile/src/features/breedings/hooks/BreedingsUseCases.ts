import { BreedingsApi } from '@/features/breedings/services/BreedingsApi';
import { BreedingsLocalRepository } from '@/features/breedings/services/BreedingsLocalRepository';
import type {
  Breeding,
  BreedingCreateInput,
  BreedingMatchInput,
  BreedingUpdateInput,
  CoiCalculationResponse,
} from '@/features/breedings/interfaces/breedings.types';

export class BreedingsUseCases {
  constructor(
    private readonly api: BreedingsApi,
    private readonly localRepository: BreedingsLocalRepository,
  ) {}

  async list(userId: string): Promise<Breeding[]> {
    return this.localRepository.listByUserId(userId);
  }

  async calculateMatch(
    input: BreedingMatchInput,
  ): Promise<CoiCalculationResponse> {
    const [male, female] = await Promise.all([
      this.localRepository.getAnimalSyncStatus(input.maleId),
      this.localRepository.getAnimalSyncStatus(input.femaleId),
    ]);
    if (
      male !== 'synced' ||
      female !== 'synced' ||
      (await this.localRepository.hasPendingGenealogy())
    )
      throw new Error(
        'Sincroniza primero los animales antes de solicitar el cálculo remoto.',
      );
    return this.api.calculateCoi(input);
  }

  async createBreeding(
    userId: string,
    input: BreedingCreateInput,
  ): Promise<Breeding> {
    const localBreeding = await this.localRepository.createLocal(userId, input);

    return localBreeding;
  }

  async updateBreeding(
    breedingId: string,
    input: BreedingUpdateInput,
  ): Promise<Breeding | null> {
    const updated = await this.localRepository.updateLocal(breedingId, input);
    if (!updated) return null;

    return updated;
  }

  async deleteBreeding(breedingId: string): Promise<boolean> {
    const deletedVersion = await this.localRepository.deleteLocal(breedingId);
    if (!deletedVersion) return false;

    return true;
  }

  async getById(id: string): Promise<Breeding | null> {
    return this.localRepository.getById(id);
  }

  async getHistory(animalId: string, userId?: string): Promise<Breeding[]> {
    if (!userId) return [];
    return this.localRepository.listByAnimalId(userId, animalId);
  }
}
