import { SpecieEntity } from "../../domain/entities/SpecieEntity";
import { SpecieError } from "../../domain/errors/SpecieError";
import type { ISpecieRepository } from "../../domain/ports/SpecieRepository";

export class GetSpecieUseCase {
  constructor(private readonly repository: ISpecieRepository) {}
  async execute(specieId: string): Promise<SpecieEntity> {
    const specie = await this.repository.findById(specieId);
    if (!specie)
      throw new SpecieError("SPECIE_NOT_FOUND", "Especie no encontrada.");
    return specie;
  }
}
