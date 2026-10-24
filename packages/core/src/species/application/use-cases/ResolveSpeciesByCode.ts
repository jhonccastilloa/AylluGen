import { Species } from "../../domain/entities/Species";
import type { SpeciesData } from "../../domain/types/Species";
import type { SpeciesRepository } from "../../domain/ports/SpeciesRepository";
import type { CreateSpeciesInput, SpeciesIdGenerator } from "./inputs";

/** Explicit server Animal integration; never invoked by mobile list or pull. */
export class ResolveSpeciesByCode<T extends SpeciesData = SpeciesData> {
  constructor(
    private readonly repository: SpeciesRepository<T>,
    private readonly generateId: SpeciesIdGenerator,
  ) {}
  execute(input: CreateSpeciesInput): Promise<T> {
    const species = Species.create({
      ...input,
      description: input.description ?? null,
      id: this.generateId(),
      userId: this.repository.ownerId,
    });
    return this.repository.findOrInsertByCode(species.id, species.toPrimitives());
  }
}
