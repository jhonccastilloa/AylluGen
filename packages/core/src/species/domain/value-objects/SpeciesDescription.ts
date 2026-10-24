import { SpeciesError } from "../errors/SpeciesError";

/** Optional free-text description for a species. */
export class SpeciesDescription {
  private constructor(private readonly rawValue: string) {}

  static create(input: string | null): SpeciesDescription | null {
    const value = input?.trim() || null;
    const message = SpeciesDescription.issue(value);
    if (message)
      throw new SpeciesError("SPECIES_INVALID", message, "description");
    return value === null ? null : new SpeciesDescription(value);
  }

  /** Reconstruct a persisted value without normalizing it. */
  static restore(value: string): SpeciesDescription {
    const message = SpeciesDescription.issue(value);
    if (message)
      throw new SpeciesError("SPECIES_INVALID", message, "description");
    return new SpeciesDescription(value);
  }

  static issue(value: string | null): string | undefined {
    if (value !== null && value.length > 200)
      return "La descripción no puede exceder 200 caracteres.";
  }

  get value(): string {
    return this.rawValue;
  }
}
