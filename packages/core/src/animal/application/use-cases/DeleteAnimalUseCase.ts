import { AnimalError } from "../../domain/errors/AnimalError";
import type { IAnimalRepository } from "../../domain/ports/AnimalRepository";

export class DeleteAnimalUseCase {
  constructor(private readonly repository: IAnimalRepository) {}

  async execute(userId: string, id: string): Promise<void> {
    await this.repository.withOwnerTransaction(userId, async (store) => {
      if (!(await store.findById(userId, id)))
        throw new AnimalError("ANIMAL_NOT_FOUND", "Animal no encontrado.");
      if (await store.hasReferences(userId, id))
        throw new AnimalError(
          "ANIMAL_IN_USE",
          "El animal tiene descendientes o registros asociados.",
        );
      await store.delete(userId, id);
    });
  }
}
