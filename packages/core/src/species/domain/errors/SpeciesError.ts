import type { SpeciesProps } from "../types/Species";

export type SpeciesErrorCode =
  | "SPECIES_INVALID"
  | "SPECIES_NOT_FOUND"
  | "SPECIES_DUPLICATE"
  | "SPECIES_CONFLICT"
  | "SPECIES_IN_USE";

export class SpeciesError extends Error {
  constructor(
    public readonly code: SpeciesErrorCode,
    message: string,
    public readonly field?: keyof SpeciesProps,
  ) {
    super(message);
    this.name = "SpeciesError";
  }
}
