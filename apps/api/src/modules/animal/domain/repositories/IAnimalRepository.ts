import {
  Animal,
  AnimalCreateDTO,
  AnimalUpdateDTO,
  Sex,
  SpeciesCode,
} from "../entities/Animal";

export interface IAnimalRepository {
  findById(id: string): Promise<Animal | null>;
  findByCrotal(crotal: string, userId: string): Promise<Animal | null>;
  findAllByUserId(userId: string, includeDeleted?: boolean): Promise<Animal[]>;
  create(data: AnimalCreateDTO): Promise<Animal>;
  update(id: string, data: AnimalUpdateDTO): Promise<Animal>;
  delete(id: string): Promise<void>;
  findPedigree(animalId: string, depth?: number): Promise<Animal | null>;
  findParents(
    animalId: string,
  ): Promise<{ father?: Animal; mother?: Animal } | null>;
  findChildren(animalId: string): Promise<Animal[]>;
  findBySpecies(userId: string, species: SpeciesCode): Promise<Animal[]>;
  findBySex(userId: string, sex: Sex): Promise<Animal[]>;
  findFounders(userId: string): Promise<Animal[]>;
}
