import type { SpeciesData } from "../../domain/types/Species";
import type { SpeciesRepository } from "../../domain/ports/SpeciesRepository";

export class ListSpecies<T extends SpeciesData = SpeciesData> {
  constructor(
    private readonly repository: SpeciesRepository<T>,
  ) {}
  execute(): Promise<T[]> {
    return this.repository.list();
  }
}
