import { injectable } from "inversify";
import type { SpeciesUnitOfWork, SpeciesSession } from "@ayllugen/core/species/unit-of-work";
import {
  prisma,
  PrismaTransaction,
} from "../../../infrastructure/database/prisma/client";
import {
  AuthenticationError,
  ConflictError,
} from "../../../shared/errors/AppError";
import type { SpeciesRecord } from "../application/SpeciesRecord";
import { PrismaSpeciesRepository } from "./repositories/PrismaSpeciesRepository";

@injectable()
export class PrismaSpeciesUnitOfWork implements SpeciesUnitOfWork<SpeciesRecord> {
  private session(
    db: PrismaTransaction,
    ownerId: string,
  ): SpeciesSession<SpeciesRecord> {
    const repository = new PrismaSpeciesRepository(db, ownerId);
    return { species: repository, usage: repository };
  }
  async read<R>(
    ownerId: string,
    work: (value: SpeciesSession<SpeciesRecord>) => Promise<R>,
  ): Promise<R> {
    return work(this.session(prisma, ownerId));
  }
  async write<R>(
    ownerId: string,
    work: (value: SpeciesSession<SpeciesRecord>) => Promise<R>,
  ): Promise<R> {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const clocks = await tx.$queryRaw<{ version: bigint }[]>`
          SELECT version FROM sync_clocks WHERE "userId" = ${ownerId} FOR UPDATE`;
          if (!clocks.length)
            throw new AuthenticationError("Cuenta no disponible");
          return work(this.session(tx, ownerId));
        },
        { isolationLevel: "ReadCommitted", timeout: 30000, maxWait: 10000 },
      );
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (["P2002", "P2003", "P2034"].includes(code ?? ""))
        throw new ConflictError(
          "La especie cambió o entra en conflicto con otro registro. Reintenta la operación.",
        );
      throw error;
    }
  }
}
