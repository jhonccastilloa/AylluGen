import type {
  AnimalEntity,
  AnimalSex,
  AnimalStatus,
} from "../entities/AnimalEntity";

export interface IAnimalQuery {
  speciesId?: string;
  sex?: AnimalSex;
  status?: AnimalStatus;
  search?: string;
  parentId?: string;
  limit: number;
  offset: number;
}

export interface IAnimalStore {
  findById(userId: string, id: string): Promise<AnimalEntity | null>;
  findByCode(userId: string, code: string): Promise<AnimalEntity | null>;
  findByCrotal(userId: string, crotal: string): Promise<AnimalEntity | null>;
  speciesExists(userId: string, speciesId: string): Promise<boolean>;
  hasReferences(userId: string, id: string): Promise<boolean>;
  hasAncestor(userId: string, id: string, ancestorId: string): Promise<boolean>;
  hasChildrenBornOnOrBefore(
    userId: string,
    id: string,
    date: string,
  ): Promise<boolean>;
  list(
    userId: string,
    query: IAnimalQuery,
  ): Promise<{ animals: AnimalEntity[]; total: number }>;
  create(animal: AnimalEntity): Promise<AnimalEntity>;
  update(animal: AnimalEntity): Promise<AnimalEntity>;
  delete(userId: string, id: string): Promise<void>;
}

export interface IAnimalRepository extends IAnimalStore {
  // Reads, relationship validation and writes share one atomic owner-scoped operation.
  withOwnerTransaction<T>(
    userId: string,
    operation: (store: IAnimalStore) => Promise<T>,
  ): Promise<T>;
}
