import type { SpeciesFields } from "../types/Species";
import { SpeciesError } from "../errors/SpeciesError";

export const normalizeSpeciesCode = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");

export function speciesCodeIssue(value: string): string | undefined {
  if (value.length < 2 || value.length > 30 || !/^[A-Z0-9_]+$/.test(value))
    return "El código debe tener entre 2 y 30 caracteres: mayúsculas, números o guion bajo.";
}

export function speciesNameIssue(value: string): string | undefined {
  if (value.length < 2 || value.length > 80)
    return "El nombre debe tener entre 2 y 80 caracteres.";
}

export function speciesDescriptionIssue(
  value: string | null,
): string | undefined {
  if (value !== null && value.length > 200)
    return "La descripción no puede exceder 200 caracteres.";
}

export function validateSpeciesFields(fields: SpeciesFields): void {
  const checks = {
    code: speciesCodeIssue(fields.code),
    name: speciesNameIssue(fields.name),
    description: speciesDescriptionIssue(fields.description),
  };
  for (const field of Object.keys(checks) as (keyof SpeciesFields)[]) {
    const message = checks[field];
    if (message) throw new SpeciesError("SPECIES_INVALID", message, field);
  }
}

export function normalizeSpeciesFields(input: SpeciesFields): SpeciesFields {
  const fields = {
    code: normalizeSpeciesCode(input.code),
    name: input.name.trim(),
    description: input.description?.trim() || null,
  };
  validateSpeciesFields(fields);
  return fields;
}

/** Caller supplies usage from its local state or the final state of a sync batch. */
export function assertSpeciesUnused(hasAnimals: boolean): void {
  if (hasAnimals)
    throw new SpeciesError(
      "SPECIES_IN_USE",
      "No se puede eliminar una especie con animales.",
    );
}
