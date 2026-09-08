import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";
import { config } from "../../../shared/constants/config";

const connectionString = config.databaseUrl;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({
  adapter,
  // Query/error logging can include private sync record values. Use service metadata.
  log: ["warn"],
});

export { prisma };

export async function transaction<T>(
  fn: (
    tx: Omit<
      PrismaClient,
      "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
    >,
  ) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(fn);
}

export type PrismaTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;
