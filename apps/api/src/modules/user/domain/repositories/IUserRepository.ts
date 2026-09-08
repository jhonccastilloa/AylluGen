import { User, UserCreateInput, UserUpdateInput } from "../entities/User";
import { PrismaTransaction } from "../../../../infrastructure/database/prisma/client";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByDni(dni: string): Promise<User | null>;
  create(data: UserCreateInput): Promise<User>;
  update(id: string, data: UserUpdateInput): Promise<User>;
  delete(id: string): Promise<void>;
  setTransactionClient(client: PrismaTransaction | null): void;
}

export const TYPE_IUserRepository = Symbol("IUserRepository");
