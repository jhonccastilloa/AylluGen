import "reflect-metadata";
import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
extendZodWithOpenApi(z);

process.env.NODE_ENV = "test";
process.env.LOG_SANITIZE = "true";
process.env.PORT = "3001";
process.env.DATABASE_URL =
  process.env.SYNC_TEST_DATABASE_URL ??
  "postgresql://test:test@localhost:5432/test_db";
process.env.JWT_SECRET = "test-secret-key-for-jwt-tokens-at-least-32-chars";
process.env.REFRESH_TOKEN_SECRET =
  "test-refresh-secret-key-for-jwt-refresh-tokens-at-least-32-chars";

jest.mock("../src/infrastructure/database/prisma/client", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
  transaction: jest.fn(),
}));
