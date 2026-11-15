import type { AnimalEntity } from "@ayllugen/core/animal/domain/entities/AnimalEntity";
import type {
  IAnimalQuery,
  IAnimalRepository,
  IAnimalStore,
} from "@ayllugen/core/animal/domain/ports/AnimalRepository";

// Behavior fake for core/HTTP tests, not a substitute for PostgreSQL transactions.
export class AnimalMemoryRepository implements IAnimalRepository {
  readonly animals = new Map<string, AnimalEntity>();
  readonly species = new Map<string, string>();
  readonly referenced = new Set<string>();

  async withOwnerTransaction<T>(
    _userId: string,
    operation: (store: IAnimalStore) => Promise<T>,
  ): Promise<T> {
    return operation(this);
  }
  async findById(userId: string, id: string): Promise<AnimalEntity | null> {
    const animal = this.animals.get(id);
    return animal?.userId === userId ? animal : null;
  }
  async findByCode(userId: string, code: string): Promise<AnimalEntity | null> {
    return (
      [...this.animals.values()].find(
        (animal) => animal.userId === userId && animal.code === code,
      ) ?? null
    );
  }
  async findByCrotal(
    userId: string,
    crotal: string,
  ): Promise<AnimalEntity | null> {
    return (
      [...this.animals.values()].find(
        (animal) => animal.userId === userId && animal.crotal === crotal,
      ) ?? null
    );
  }
  async speciesExists(userId: string, speciesId: string): Promise<boolean> {
    return this.species.get(speciesId) === userId;
  }
  async hasReferences(userId: string, id: string): Promise<boolean> {
    return (
      this.referenced.has(id) ||
      [...this.animals.values()].some(
        (animal) =>
          animal.userId === userId &&
          (animal.fatherId === id || animal.motherId === id),
      )
    );
  }
  async hasAncestor(
    userId: string,
    id: string,
    ancestorId: string,
  ): Promise<boolean> {
    const pending = [id];
    const visited = new Set<string>();
    while (pending.length) {
      const current = pending.pop()!;
      if (current === ancestorId) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      const animal = await this.findById(userId, current);
      if (animal?.fatherId) pending.push(animal.fatherId);
      if (animal?.motherId) pending.push(animal.motherId);
    }
    return false;
  }
  async hasChildrenBornOnOrBefore(
    userId: string,
    id: string,
    date: string,
  ): Promise<boolean> {
    return [...this.animals.values()].some(
      (animal) =>
        animal.userId === userId &&
        (animal.fatherId === id || animal.motherId === id) &&
        animal.birthDate !== null &&
        animal.birthDate <= date,
    );
  }
  async list(
    userId: string,
    query: IAnimalQuery,
  ): Promise<{ animals: AnimalEntity[]; total: number }> {
    const found = [...this.animals.values()]
      .filter(
        (animal) =>
          animal.userId === userId &&
          (!query.speciesId || animal.speciesId === query.speciesId) &&
          (!query.sex || animal.sex === query.sex) &&
          (!query.status || animal.status === query.status) &&
          (!query.parentId ||
            animal.fatherId === query.parentId ||
            animal.motherId === query.parentId) &&
          (!query.search ||
            [animal.code, animal.crotal].some((value) =>
              value?.toUpperCase().includes(query.search!.toUpperCase()),
            )),
      )
      .sort((a, b) => a.code.localeCompare(b.code) || a.id.localeCompare(b.id));
    return {
      animals: found.slice(query.offset, query.offset + query.limit),
      total: found.length,
    };
  }
  async create(animal: AnimalEntity): Promise<AnimalEntity> {
    this.animals.set(animal.id, animal);
    return animal;
  }
  async update(animal: AnimalEntity): Promise<AnimalEntity> {
    return this.create(animal);
  }
  async delete(userId: string, id: string): Promise<void> {
    if (await this.findById(userId, id)) this.animals.delete(id);
  }
}
