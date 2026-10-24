import { Species } from "../../domain/entities/Species";
import type { SpeciesData } from "../../domain/types/Species";
import type { SpeciesUnitOfWork } from "../../domain/ports/SpeciesUnitOfWork";
import type { UpdateSpeciesInput } from "./inputs";
import { assertUnique, requireSpecies } from "./requireSpecies";

export class UpdateSpecies<T extends SpeciesData = SpeciesData> {
  constructor(
    private readonly unit: SpeciesUnitOfWork<T>,
    private readonly ownerId: string,
  ) {}
  execute(id: string, input: UpdateSpeciesInput): Promise<T> {
    return this.unit.write(this.ownerId, async ({ species: repository }) => {
      const species = Species.restore(await requireSpecies(repository, id));
      species.changeDetails(input);
      await assertUnique(repository, species.toPrimitives(), id);
      return repository.update(id, species.toPrimitives());
    });
  }
}
