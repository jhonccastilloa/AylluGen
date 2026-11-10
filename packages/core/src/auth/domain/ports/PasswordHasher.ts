import type { PlainPassword } from "../value-objects/PlainPassword";

export interface IPasswordHasher {
  hash(password: PlainPassword): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}
