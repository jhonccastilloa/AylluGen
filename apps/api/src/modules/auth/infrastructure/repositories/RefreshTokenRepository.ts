import { injectable } from "inversify";
import {
  prisma,
  PrismaTransaction,
} from "../../../../infrastructure/database/prisma/client";
import { RefreshToken } from "../../domain/entities/RefreshToken";
import { IRefreshTokenRepository } from "../../domain/repositories/IRefreshTokenRepository";

@injectable()
export class RefreshTokenRepository implements IRefreshTokenRepository {
  private transactionClient: PrismaTransaction | null = null;

  setTransactionClient(client: PrismaTransaction | null): void {
    this.transactionClient = client;
  }

  private get client() {
    return this.transactionClient || prisma;
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    const refreshToken = await this.client.refreshToken.findUnique({
      where: { token },
    });
    return refreshToken;
  }

  async create(
    token: string,
    userId: string,
    expiresAt: Date,
  ): Promise<RefreshToken> {
    const refreshToken = await this.client.refreshToken.create({
      data: { token, userId, expiresAt },
    });
    return refreshToken;
  }

  async delete(token: string): Promise<void> {
    await this.client.refreshToken.delete({
      where: { token },
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.client.refreshToken.deleteMany({
      where: { userId },
    });
  }
}
