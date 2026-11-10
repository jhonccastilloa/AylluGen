import bcrypt from "bcryptjs";
import type { IPasswordHasher } from "@ayllugen/core/auth/domain/ports/PasswordHasher";
import type { PlainPassword } from "@ayllugen/core/auth/domain/value-objects/PlainPassword";

export class BcryptPasswordHasher implements IPasswordHasher {
  hash(password: PlainPassword): Promise<string> {
    return bcrypt.hash(password.value, 10);
  }
  verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
