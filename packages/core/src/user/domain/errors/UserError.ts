import { DomainError } from "../../../shared/errors/DomainError";
import type { DomainErrorKind } from "../../../shared/errors/DomainError";

export type UserErrorCode =
  "USER_INVALID" | "USER_NOT_FOUND" | "USER_DUPLICATE";

const kindByCode = {
  USER_INVALID: "validation",
  USER_NOT_FOUND: "not_found",
  USER_DUPLICATE: "conflict",
} satisfies Record<UserErrorCode, DomainErrorKind>;
export class UserError extends DomainError {
  constructor(
    public readonly code: UserErrorCode,
    message: string,
  ) {
    super(code, kindByCode[code], message);
  }
}
