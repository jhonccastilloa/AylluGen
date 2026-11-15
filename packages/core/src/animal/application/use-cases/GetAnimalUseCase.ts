import type { AnimalEntity } from "../../domain/entities/AnimalEntity";
import { AnimalError } from "../../domain/errors/AnimalError";
import type { IAnimalRepository } from "../../domain/ports/AnimalRepository";

export interface IGetAnimalResult {
  animal: AnimalEntity;
  father: AnimalEntity | null;
  mother: AnimalEntity | null;
}

export class GetAnimalUseCase {
  constructor(private readonly animalRepository: IAnimalRepository) {}

  async execute(userId: string, id: string): Promise<IGetAnimalResult> {
    const animal = await this.animalRepository.findById(userId, id);
    if (!animal)
      throw new AnimalError("ANIMAL_NOT_FOUND", "Animal no encontrado.");
    const [father, mother] = await Promise.all([
      animal.fatherId
        ? this.animalRepository.findById(userId, animal.fatherId)
        : null,
      animal.motherId
        ? this.animalRepository.findById(userId, animal.motherId)
        : null,
    ]);
    return { animal, father, mother };
  }
}
