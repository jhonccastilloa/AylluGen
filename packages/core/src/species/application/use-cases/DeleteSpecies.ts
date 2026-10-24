import { assertSpeciesUnused } from "../../domain/policies/SpeciesDeletionPolicy";
import type { SpeciesData } from "../../domain/types/Species";
import type { SpeciesRepository } from "../../domain/ports/SpeciesRepository";
import { requireSpecies } from "./requireSpecies";

export class DeleteSpecies<T extends SpeciesData = SpeciesData> {
  constructor(
    private readonly repository: SpeciesRepository<T>,
  ) {}
  async execute(id: string): Promise<void> {
    await requireSpecies(this.repository, id);
    assertSpeciesUnused(await this.repository.hasAnimals(id));
    await this.repository.delete(id);
  }
}
