import type { SpeciesData } from "../../domain/types/Species";
import type { SpeciesUnitOfWork } from "../ports/SpeciesUnitOfWork";
import { requireSpecies } from "./requireSpecies";

export class GetSpecies<T extends SpeciesData = SpeciesData> {
  constructor(
    private readonly unit: SpeciesUnitOfWork<T>,
    private readonly ownerId: string,
  ) {}
  execute(id: string): Promise<T> {
    return this.unit.read(this.ownerId, ({ species }) =>
      requireSpecies(species, id),
    );
  }
}
