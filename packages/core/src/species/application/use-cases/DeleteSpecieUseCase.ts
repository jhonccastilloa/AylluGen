import { SpecieError } from "../../domain/errors/SpecieError";
import type { ISpecieRepository } from "../../domain/ports/SpecieRepository";

export class DeleteSpecieUseCase {
  constructor(private readonly repository: ISpecieRepository) {}
  async execute(userId: string, specieId: string): Promise<void> {
    const specie = await this.repository.findById(userId, specieId);
    if (!specie)
      throw new SpecieError("SPECIE_NOT_FOUND", "Especie no encontrada.");
    if (await this.repository.hasAnimals(userId, specieId))
      throw new SpecieError(
        "SPECIE_IN_USE",
        "La especie tiene animales asociados.",
      );
    await this.repository.delete(userId, specieId);
  }
}
