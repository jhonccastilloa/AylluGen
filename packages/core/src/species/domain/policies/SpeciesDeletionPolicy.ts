import { SpecieError } from "../errors/SpecieError";

export function assertSpecieUnused(hasAnimals: boolean): void {
  if (hasAnimals) throw new SpecieError("SPECIES_IN_USE", "La especie tiene animales asociados.");
}

export const assertSpeciesUnused = assertSpecieUnused;
