import { RefreshToken } from "../entities/RefreshToken";
import { PrismaTransaction } from "../../../../infrastructure/database/prisma/client";

export interface IRefreshTokenRepository {
  findByToken(token: string): Promise<RefreshToken | null>;
  create(token: string, userId: string, expiresAt: Date): Promise<RefreshToken>;
  delete(token: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
  setTransactionClient(client: PrismaTransaction | null): void;
}

export const TYPE_IRefreshTokenRepository = Symbol("IRefreshTokenRepository");
