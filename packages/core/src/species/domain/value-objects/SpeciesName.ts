import { SpeciesError } from "../errors/SpeciesError";

/** Display name for a species, kept valid independently from its entity. */
export class SpeciesName {
  private constructor(private readonly rawValue: string) {}

  static create(input: string): SpeciesName {
    const value = SpeciesName.normalize(input);
    const message = SpeciesName.issue(value);
    if (message) throw new SpeciesError("SPECIES_INVALID", message, "name");
    return new SpeciesName(value);
  }

  /** Reconstruct a persisted value without normalizing it. */
  static restore(value: string): SpeciesName {
    const message = SpeciesName.issue(value);
    if (message) throw new SpeciesError("SPECIES_INVALID", message, "name");
    return new SpeciesName(value);
  }

  static normalize(value: string): string {
    return value.trim();
  }

  static issue(value: string): string | undefined {
    if (value.trim().length < 2 || value.length > 80)
      return "El nombre debe tener entre 2 y 80 caracteres.";
  }

  get value(): string {
    return this.rawValue;
  }
}
