import { SpecieError } from "../../domain/errors/SpecieError";
import type { ISpecieRepository } from "../../domain/ports/SpecieRepository";

export class DeleteSpecieUseCase {
  constructor(private readonly specieRepository: ISpecieRepository) {}
  async execute(userId: string, specieId: string): Promise<void> {
    const specie = await this.specieRepository.findById(userId, specieId);
    if (!specie)
      throw new SpecieError("SPECIE_NOT_FOUND", "Especie no encontrada.");
    if (await this.specieRepository.hasAnimals(userId, specieId))
      throw new SpecieError(
        "SPECIE_IN_USE",
        "La especie tiene animales asociados.",
      );
    await this.specieRepository.delete(userId, specieId);
  }
}
