import { DomainError } from "../../../shared/errors/DomainError";
import type { DomainErrorKind } from "../../../shared/errors/DomainError";

export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "INVALID_REFRESH_TOKEN"
  | "PASSWORD_INVALID";

const kindByCode = {
  INVALID_CREDENTIALS: "unauthenticated",
  INVALID_REFRESH_TOKEN: "unauthenticated",
  PASSWORD_INVALID: "validation",
} satisfies Record<AuthErrorCode, DomainErrorKind>;

export class AuthError extends DomainError {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
  ) {
    super(code, kindByCode[code], message);
  }
}
