import { SpeciesError } from "../errors/SpeciesError";

/** Caller supplies usage from its local state or the final state of a sync batch. */
export function assertSpeciesUnused(hasAnimals: boolean): void {
  if (hasAnimals)
    throw new SpeciesError(
      "SPECIES_IN_USE",
      "No se puede eliminar una especie con animales.",
    );
}
