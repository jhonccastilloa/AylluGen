import { SpecieEntity } from "../entities/SpecieEntity";

export interface ISpecieRepository {
  readonly ownerId: string;
  list(): Promise<SpecieEntity[]>;
  findById(id: string): Promise<SpecieEntity | null>;
  findByName(name: string): Promise<SpecieEntity | null>;
  hasAnimals(specieId: string): Promise<boolean>;
  insert(specie: SpecieEntity): Promise<SpecieEntity>;
  update(specie: SpecieEntity): Promise<SpecieEntity>;
  delete(specieId: string): Promise<void>;
}

export type ISpeciesRepository = ISpecieRepository;
