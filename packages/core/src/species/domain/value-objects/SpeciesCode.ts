import { SpeciesError } from "../errors/SpeciesError";

/**
 * Canonical identifier for a species. It owns the formatting and invariants
 * that apply to a code regardless of the entity operation that uses it.
 */
export class SpeciesCode {
  private constructor(private readonly rawValue: string) {}

  static create(input: string): SpeciesCode {
    const value = SpeciesCode.normalize(input);
    const message = SpeciesCode.issue(value);
    if (message) throw new SpeciesError("SPECIES_INVALID", message, "code");
    return new SpeciesCode(value);
  }

  /** Reconstruct a persisted value without normalizing it. */
  static restore(value: string): SpeciesCode {
    const message = SpeciesCode.issue(value);
    if (message) throw new SpeciesError("SPECIES_INVALID", message, "code");
    return new SpeciesCode(value);
  }

  static normalize(value: string): string {
    return value
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_")
      .replace(/[^A-Z0-9_]/g, "");
  }

  static issue(value: string): string | undefined {
    if (value.length < 2 || value.length > 30 || !/^[A-Z0-9_]+$/.test(value))
      return "El código debe tener entre 2 y 30 caracteres: mayúsculas, números o guion bajo.";
  }

  get value(): string {
    return this.rawValue;
  }
}
