import type {
  AnimalSex,
  AnimalStatus,
} from "../../domain/entities/AnimalEntity";
import type { IAnimalRepository } from "../../domain/ports/AnimalRepository";
import { AnimalError } from "../../domain/errors/AnimalError";
import type { IAnimalPageResult } from "../results/AnimalPageResult";

export interface IListAnimalInput {
  userId: string;
  speciesId?: string;
  sex?: AnimalSex;
  status?: AnimalStatus | "ALL";
  search?: string;
  limit?: number;
  offset?: number;
}

export class ListAnimalUseCase {
  constructor(private readonly repository: IAnimalRepository) {}

  async execute(input: IListAnimalInput): Promise<IAnimalPageResult> {
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
    return this.repository.list(input.userId, {
      speciesId: input.speciesId,
      sex: input.sex,
      status: input.status === "ALL" ? undefined : (input.status ?? "ACTIVE"),
      search: input.search?.trim(),
      limit,
      offset,
    });
  }
}
