import {
  Breeding,
  BreedingCreateInput,
  BreedingUpdateInput,
} from "../entities/Breeding";

export interface IBreedingRepository {
  findById(id: string): Promise<Breeding | null>;
  findByParents(maleId: string, femaleId: string): Promise<Breeding | null>;
  findAllByUserId(userId: string): Promise<Breeding[]>;
  create(data: BreedingCreateInput): Promise<Breeding>;
  update(id: string, data: BreedingUpdateInput): Promise<Breeding>;
  delete(id: string): Promise<void>;
  findBreedingHistory(animalId: string): Promise<Breeding[]>;
}
