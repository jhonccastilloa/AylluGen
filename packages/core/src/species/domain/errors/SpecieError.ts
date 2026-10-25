export type SpecieErrorCode =
  | "SPECIE_INVALID"
  | "SPECIE_NOT_FOUND"
  | "SPECIE_DUPLICATE"
  | "SPECIE_CONFLICT"
  | "SPECIE_IN_USE";
// Existing adapters use the plural spelling of these domain errors.
export type SpeciesErrorCode = SpecieErrorCode
  | "SPECIES_INVALID" | "SPECIES_NOT_FOUND" | "SPECIES_DUPLICATE"
  | "SPECIES_CONFLICT" | "SPECIES_IN_USE";

export class SpecieError extends Error {
  constructor(
    public readonly code: SpeciesErrorCode,
    message: string,
    public readonly field?: "name",
  ) {
    super(message);
    this.name = "SpecieError";
  }
}
export { SpecieError as SpeciesError };
