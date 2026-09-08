import {
  Species,
  SpeciesCreateInput,
  SpeciesUpdateInput,
} from "../entities/Species";

export interface ISpeciesRepository {
  findById(id: string): Promise<Species | null>;
  findByCode(userId: string, code: string): Promise<Species | null>;
  findByName(userId: string, name: string): Promise<Species | null>;
  findAllByUserId(userId: string): Promise<Species[]>;
  create(input: SpeciesCreateInput): Promise<Species>;
  update(id: string, input: SpeciesUpdateInput): Promise<Species>;
  delete(id: string): Promise<void>;
  countAnimalsBySpeciesId(userId: string, speciesId: string): Promise<number>;
}

