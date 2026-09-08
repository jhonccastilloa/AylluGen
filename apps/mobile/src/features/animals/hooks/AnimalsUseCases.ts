import type {
  AnimalsLocalRepository,
  AnimalsFilter,
} from '../services/AnimalsLocalRepository';
import type {
  Animal,
  AnimalCreateInput,
  AnimalUpdateInput,
} from '../interfaces/animals.types';

export class AnimalsUseCases {
  constructor(private readonly localRepository: AnimalsLocalRepository) {}
  listInventory(userId: string, filter?: AnimalsFilter) {
    return this.localRepository.listByUserId(userId, filter);
  }
  getById(id: string) {
    return this.localRepository.getById(id);
  }
  registerAnimal(userId: string, input: AnimalCreateInput) {
    return this.localRepository.createLocal(userId, input);
  }
  updateAnimal(id: string, input: AnimalUpdateInput) {
    return this.localRepository.updateLocal(id, input);
  }
  async deleteAnimal(id: string) {
    return Boolean(await this.localRepository.softDeleteLocal(id));
  }
  getFounders(userId: string) {
    return this.localRepository.getFounders(userId);
  }
  getMales(userId: string) {
    return this.localRepository.getMales(userId);
  }
  getFemales(userId: string) {
    return this.localRepository.getFemales(userId);
  }
  async getPedigree(id: string): Promise<Animal | null> {
    // The detail UI uses this record's parent IDs; no remote entity fallback.
    return this.localRepository.getById(id);
  }
}
