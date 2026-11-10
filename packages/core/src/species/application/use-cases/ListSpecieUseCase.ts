import type { SpecieEntity } from "../../domain/entities/SpecieEntity";
import type { ISpecieRepository } from "../../domain/ports/SpecieRepository";

export class ListSpecieUseCase {
  constructor(private readonly repository: ISpecieRepository) {}
  execute(userId: string): Promise<SpecieEntity[]> {
    return this.repository.list(userId);
  }
}
