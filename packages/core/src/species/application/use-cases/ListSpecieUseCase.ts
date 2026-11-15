import type { SpecieEntity } from "../../domain/entities/SpecieEntity";
import type { ISpecieRepository } from "../../domain/ports/SpecieRepository";

export class ListSpecieUseCase {
  constructor(private readonly specieRepository: ISpecieRepository) {}
  execute(userId: string): Promise<SpecieEntity[]> {
    return this.specieRepository.list(userId);
  }
}
