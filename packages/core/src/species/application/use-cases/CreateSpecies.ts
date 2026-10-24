import { Species } from "../../domain/entities/Species";
import type { SpeciesData } from "../../domain/types/Species";
import type { SpeciesRepository } from "../../domain/ports/SpeciesRepository";
import type { CreateSpeciesInput, SpeciesIdGenerator } from "./inputs";
import { assertUnique } from "./requireSpecies";

export class CreateSpecies<T extends SpeciesData = SpeciesData> {
  constructor(
    private readonly repository: SpeciesRepository<T>,
    private readonly generateId: SpeciesIdGenerator,
  ) {}
  async execute(input: CreateSpeciesInput): Promise<T> {
    const species = Species.create({
      ...input,
      description: input.description ?? null,
      id: this.generateId(),
      userId: this.repository.ownerId,
    });
    await assertUnique(this.repository, species.toPrimitives());
    return this.repository.insert(species.id, species.toPrimitives());
  }
}
