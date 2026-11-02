import { DomainError } from "../../../shared/errors/DomainError";
import type { DomainErrorKind } from "../../../shared/errors/DomainError";

export type SpecieErrorCode =
  | "SPECIE_INVALID"
  | "SPECIE_NOT_FOUND"
  | "SPECIE_DUPLICATE"
  | "SPECIE_CONFLICT"
  | "SPECIE_IN_USE";

const kindByCode = {
  SPECIE_INVALID: "validation",
  SPECIE_NOT_FOUND: "not_found",
  SPECIE_DUPLICATE: "conflict",
  SPECIE_CONFLICT: "conflict",
  SPECIE_IN_USE: "conflict",
} satisfies Record<SpecieErrorCode, DomainErrorKind>;

export class SpecieError extends DomainError {
  constructor(
    public readonly code: SpecieErrorCode,
    message: string,
  ) {
    super(code, kindByCode[code], message);
  }
}
