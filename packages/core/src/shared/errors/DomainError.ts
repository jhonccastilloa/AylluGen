export type DomainErrorKind = "validation" | "not_found" | "conflict";

/** Expected business failures. Transport adapters decide how to present them. */
export abstract class DomainError extends Error {
  protected constructor(
    public readonly code: string,
    public readonly kind: DomainErrorKind,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
