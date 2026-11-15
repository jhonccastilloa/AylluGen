import { DomainError } from "../../../shared/errors/DomainError";
import type { DomainErrorKind } from "../../../shared/errors/DomainError";

export type AnimalErrorCode =
  | "ANIMAL_INVALID"
  | "ANIMAL_NOT_FOUND"
  | "ANIMAL_DUPLICATE_CODE"
  | "ANIMAL_DUPLICATE_CROTAL"
  | "ANIMAL_SPECIES_NOT_FOUND"
  | "ANIMAL_PARENT_NOT_FOUND"
  | "ANIMAL_INVALID_PARENT"
  | "ANIMAL_LINEAGE_CYCLE"
  | "ANIMAL_INVALID_DATES"
  | "ANIMAL_IN_USE";

const kindByCode = {
  ANIMAL_INVALID: "validation",
  ANIMAL_NOT_FOUND: "not_found",
  ANIMAL_DUPLICATE_CODE: "conflict",
  ANIMAL_DUPLICATE_CROTAL: "conflict",
  ANIMAL_SPECIES_NOT_FOUND: "not_found",
  ANIMAL_PARENT_NOT_FOUND: "not_found",
  ANIMAL_INVALID_PARENT: "validation",
  ANIMAL_LINEAGE_CYCLE: "validation",
  ANIMAL_INVALID_DATES: "validation",
  ANIMAL_IN_USE: "conflict",
} satisfies Record<AnimalErrorCode, DomainErrorKind>;

export class AnimalError extends DomainError {
  constructor(
    public readonly code: AnimalErrorCode,
    message: string,
  ) {
    super(code, kindByCode[code], message);
  }
}
