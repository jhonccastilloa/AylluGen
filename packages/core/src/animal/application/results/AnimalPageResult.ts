import type { AnimalEntity } from "../../domain/entities/AnimalEntity";

export interface IAnimalPageResult {
  animals: AnimalEntity[];
  total: number;
}
