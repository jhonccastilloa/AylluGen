import { SpecieError } from "../errors/SpecieError";

export class SpecieCode {
  private constructor(private readonly rawValue: string) {}

  static create(input: string): SpecieCode {
    const value = SpecieCode.normalize(input);
    const message = SpecieCode.issue(value);
    if (message) throw new SpecieError("SPECIE_INVALID", message);
    return new SpecieCode(value);
  }

  static restore(value: string): SpecieCode {
    const message = SpecieCode.issue(value);
    if (message) throw new SpecieError("SPECIE_INVALID", message);
    return new SpecieCode(value);
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
