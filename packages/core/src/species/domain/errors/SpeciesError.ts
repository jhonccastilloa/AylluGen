import type { SpeciesFields } from "../types/Species";

export type SpeciesErrorCode =
  | "SPECIES_INVALID"
  | "SPECIES_NOT_FOUND"
  | "SPECIES_DUPLICATE"
  | "SPECIES_IN_USE";

export class SpeciesError extends Error {
  constructor(
    public readonly code: SpeciesErrorCode,
    message: string,
    public readonly field?: keyof SpeciesFields,
  ) {
    super(message);
    this.name = "SpeciesError";
  }
}
