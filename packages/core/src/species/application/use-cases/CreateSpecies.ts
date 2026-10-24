import { Species } from "../../domain/entities/Species";
import type { SpeciesData } from "../../domain/types/Species";
import type {
  SpeciesUnitOfWork,
  SpeciesIdGenerator,
} from "../../domain/ports/SpeciesUnitOfWork";
import type { CreateSpeciesInput } from "./inputs";
import { assertUnique } from "./requireSpecies";

export class CreateSpecies<T extends SpeciesData = SpeciesData> {
  constructor(
    private readonly unit: SpeciesUnitOfWork<T>,
    private readonly ownerId: string,
    private readonly generateId: SpeciesIdGenerator,
  ) {}
  execute(input: CreateSpeciesInput): Promise<T> {
    const species = Species.create({
      ...input,
      description: input.description ?? null,
      id: this.generateId(),
      userId: this.ownerId,
    });
    return this.unit.write(this.ownerId, async ({ species: repository }) => {
      await assertUnique(repository, species.toPrimitives());
      return repository.insert(species.id, species.toPrimitives());
    });
  }
}
