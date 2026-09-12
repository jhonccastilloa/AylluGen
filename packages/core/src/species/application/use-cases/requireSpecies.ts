import { SpeciesError } from "../../domain/errors/SpeciesError";
import type { SpeciesData, SpeciesFields } from "../../domain/types/Species";
import type { SpeciesRepository } from "../ports/SpeciesRepository";

export async function requireSpecies<T extends SpeciesData>(
  repository: SpeciesRepository<T>,
  id: string,
): Promise<T> {
  const species = await repository.findById(id);
  if (!species)
    throw new SpeciesError("SPECIES_NOT_FOUND", "Especie no encontrada.");
  return species;
}

export async function assertUnique(
  repository: SpeciesRepository,
  fields: SpeciesFields,
  exceptId?: string,
): Promise<void> {
  const field = await repository.findConflict(fields, exceptId);
  if (field)
    throw new SpeciesError(
      "SPECIES_DUPLICATE",
      "Ya existe una especie con ese código o nombre.",
      field,
    );
}
