import type { SpeciesData } from "../../domain/types/Species";
import type { SpeciesRepository } from "../../domain/ports/SpeciesRepository";
import { requireSpecies } from "./requireSpecies";

export class GetSpecies<T extends SpeciesData = SpeciesData> {
  constructor(
    private readonly repository: SpeciesRepository<T>,
  ) {}
  execute(id: string): Promise<T> {
    return requireSpecies(this.repository, id);
  }
}
