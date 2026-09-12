import type { SpeciesData } from "../../domain/types/Species";
import type { CreateSpeciesInput } from "./inputs";
import type { ListSpecies } from "./ListSpecies";
import type { ResolveSpeciesByCode } from "./ResolveSpeciesByCode";

/** Explicit initialization, never an implicit side effect of the shared query. */
export class InitializeSpeciesCatalog<T extends SpeciesData = SpeciesData> {
  constructor(
    private readonly list: ListSpecies<T>,
    private readonly resolve: ResolveSpeciesByCode<T>,
  ) {}
  async execute(defaults: readonly CreateSpeciesInput[]): Promise<void> {
    if ((await this.list.execute()).length) return;
    for (const item of defaults) await this.resolve.execute(item);
  }
}
