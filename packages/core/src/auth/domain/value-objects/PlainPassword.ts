import { AuthError } from "../errors/AuthError";

export class PlainPassword {
  readonly #value: string;

  private constructor(value: string) {
    this.#value = value;
  }

  static create(value: string): PlainPassword {
    if (
      value.length < 8 ||
      new TextEncoder().encode(value).length > 72 ||
      !/[A-Z]/.test(value) ||
      !/[a-z]/.test(value) ||
      !/[0-9]/.test(value) ||
      !/[^A-Za-z0-9]/.test(value)
    ) {
      throw new AuthError(
        "PASSWORD_INVALID",
        "La contraseña no cumple con los requisitos de seguridad.",
      );
    }
    return new PlainPassword(value);
  }

  get value(): string {
    return this.#value;
  }

  toString(): string {
    return "[REDACTED]";
  }

  toJSON(): string {
    return "[REDACTED]";
  }
}
