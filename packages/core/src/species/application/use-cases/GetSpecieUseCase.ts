import type { SpecieEntity } from "../../domain/entities/SpecieEntity";
import { SpecieError } from "../../domain/errors/SpecieError";
import type { ISpecieRepository } from "../../domain/ports/SpecieRepository";

export class GetSpecieUseCase {
  constructor(private readonly specieRepository: ISpecieRepository) {}
  async execute(userId: string, specieId: string): Promise<SpecieEntity> {
    const specie = await this.specieRepository.findById(userId, specieId);
    if (!specie)
      throw new SpecieError("SPECIE_NOT_FOUND", "Especie no encontrada.");
    return specie;
  }
}
