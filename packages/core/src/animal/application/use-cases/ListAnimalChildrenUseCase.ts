import { AnimalError } from "../../domain/errors/AnimalError";
import type { IAnimalRepository } from "../../domain/ports/AnimalRepository";
import type { IAnimalPageResult } from "../results/AnimalPageResult";

export interface IListAnimalChildrenInput {
  userId: string;
  id: string;
  limit?: number;
  offset?: number;
}

export class ListAnimalChildrenUseCase {
  constructor(private readonly animalRepository: IAnimalRepository) {}

  async execute(input: IListAnimalChildrenInput): Promise<IAnimalPageResult> {
    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !Number.isSafeInteger(offset) ||
      offset < 0
    ) {
      throw new AnimalError("ANIMAL_INVALID", "La paginación es inválida.");
    }
    if (!(await this.animalRepository.findById(input.userId, input.id)))
      throw new AnimalError("ANIMAL_NOT_FOUND", "Animal no encontrado.");
    return this.animalRepository.list(input.userId, {
      parentId: input.id,
      limit,
      offset,
    });
  }
}
