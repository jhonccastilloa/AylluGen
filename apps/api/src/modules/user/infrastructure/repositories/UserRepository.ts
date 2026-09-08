import { injectable } from "inversify";
import {
  User,
  UserCreateInput,
  UserUpdateInput,
} from "../../domain/entities/User";
import { IUserRepository } from "../../domain/repositories/IUserRepository";
import {
  prisma,
  PrismaTransaction,
} from "../../../../infrastructure/database/prisma/client";

@injectable()
export class UserRepository implements IUserRepository {
  private transactionClient: PrismaTransaction | null = null;

  setTransactionClient(client: PrismaTransaction | null): void {
    this.transactionClient = client;
  }

  private get client() {
    return this.transactionClient || prisma;
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.client.user.findUnique({
      where: { id },
    });
    return user;
  }

  async findByDni(dni: string): Promise<User | null> {
    const user = await this.client.user.findUnique({
      where: { dni },
    });
    return user;
  }

  async create(data: UserCreateInput): Promise<User> {
    const user = await this.client.user.create({
      data,
    });
    return user;
  }

  async update(id: string, data: UserUpdateInput): Promise<User> {
    const user = await this.client.user.update({
      where: { id },
      data,
    });
    return user;
  }

  async delete(id: string): Promise<void> {
    await this.client.user.delete({
      where: { id },
    });
  }
}
