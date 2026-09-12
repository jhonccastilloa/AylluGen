import type { SpeciesData } from "../../domain/types/Species";
import type { SpeciesUnitOfWork } from "../ports/SpeciesUnitOfWork";

export class ListSpecies<T extends SpeciesData = SpeciesData> {
  constructor(
    private readonly unit: SpeciesUnitOfWork<T>,
    private readonly ownerId: string,
  ) {}
  execute(): Promise<T[]> {
    return this.unit.read(this.ownerId, ({ species }) => species.list());
  }
}
