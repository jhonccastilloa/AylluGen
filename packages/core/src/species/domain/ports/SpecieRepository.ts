import type { SpecieEntity } from "../entities/SpecieEntity";

export interface ISpecieRepository {
  list(userId: string): Promise<SpecieEntity[]>;
  findById(userId: string, id: string): Promise<SpecieEntity | null>;
  findByName(userId: string, name: string): Promise<SpecieEntity | null>;
  hasAnimals(userId: string, specieId: string): Promise<boolean>;
  insert(specie: SpecieEntity): Promise<SpecieEntity>;
  update(specie: SpecieEntity): Promise<SpecieEntity>;
  delete(userId: string, specieId: string): Promise<void>;
}

export type ISpeciesRepository = ISpecieRepository;
