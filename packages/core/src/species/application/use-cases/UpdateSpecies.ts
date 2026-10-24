import { Species } from "../../domain/entities/Species";
import type { SpeciesData } from "../../domain/types/Species";
import type { SpeciesRepository } from "../../domain/ports/SpeciesRepository";
import type { UpdateSpeciesInput } from "./inputs";
import { assertUnique, requireSpecies } from "./requireSpecies";

export class UpdateSpecies<T extends SpeciesData = SpeciesData> {
  constructor(
    private readonly repository: SpeciesRepository<T>,
  ) {}
  async execute(id: string, input: UpdateSpeciesInput): Promise<T> {
    const previous = await requireSpecies(this.repository, id);
    const species = Species.restore(previous);
    species.changeDetails(input);
    await assertUnique(this.repository, species.toPrimitives(), id);
    return this.repository.update(id, species.toPrimitives(), previous);
  }
}
