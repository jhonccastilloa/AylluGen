import { assertSpeciesUnused } from "../../domain/services/SpeciesRules";
import type { SpeciesData } from "../../domain/types/Species";
import type { SpeciesUnitOfWork } from "../ports/SpeciesUnitOfWork";
import { requireSpecies } from "./requireSpecies";

export class DeleteSpecies<T extends SpeciesData = SpeciesData> {
  constructor(
    private readonly unit: SpeciesUnitOfWork<T>,
    private readonly ownerId: string,
  ) {}
  execute(id: string): Promise<void> {
    return this.unit.write(this.ownerId, async ({ species, usage }) => {
      await requireSpecies(species, id);
      assertSpeciesUnused(await usage.hasAnimals(id));
      await species.delete(id);
    });
  }
}
