import { injectable } from "inversify";
import {
  prisma,
  PrismaTransaction,
} from "../../../../infrastructure/database/prisma/client";
import {
  IWatermelonRepository,
  SyncSession,
} from "../../domain/repositories/IWatermelonRepository";
import {
  Mutation,
  SYNC_LIMITS,
  SYNC_TABLES,
  SyncTable,
  TrackedRecord,
} from "../../domain/entities/Watermelon";
import { fields } from "../../application/schemas/watermelon.schema";
import {
  AuthenticationError,
  ConflictError,
  ValidationError,
} from "../../../../shared/errors/AppError";

class PostgresSyncSession implements SyncSession {
  constructor(
    private tx: PrismaTransaction,
    private userId: string,
  ) {}

  async checkpoint(lock = false): Promise<bigint> {
    const rows = lock
      ? await this.tx.$queryRaw<
          { version: bigint }[]
        >`SELECT version FROM sync_clocks WHERE "userId" = ${this.userId} FOR UPDATE`
      : await this.tx.$queryRaw<
          { version: bigint }[]
        >`SELECT version FROM sync_clocks WHERE "userId" = ${this.userId}`;
    if (!rows[0]) throw new AuthenticationError("Cuenta no disponible");
    return rows[0].version;
  }

  async changesSince(
    checkpoint: bigint,
    fullTables: SyncTable[],
  ): Promise<TrackedRecord[]> {
    return this.tx.$queryRaw<TrackedRecord[]>`
      SELECT * FROM sync_records WHERE "userId" = ${this.userId}
      AND (version > ${checkpoint} OR (NOT deleted AND "tableName" = ANY(${fullTables}::text[])))
      AND (${checkpoint} <> 0 OR NOT deleted)
      ORDER BY version, "tableName", "recordId" LIMIT ${SYNC_LIMITS.pullRecords + 1}`;
  }

  async recordsByIds(ids: string[]): Promise<TrackedRecord[]> {
    if (!ids.length) return [];
    // Intentionally includes other owners only for collision denial. Never returned over HTTP.
    return this.tx.$queryRaw<
      TrackedRecord[]
    >`SELECT * FROM sync_records WHERE "recordId" = ANY(${ids}::text[])`;
  }

  async graph(): Promise<TrackedRecord[]> {
    return this.tx.$queryRaw<TrackedRecord[]>`SELECT * FROM sync_records
      WHERE "userId" = ${this.userId} AND "tableName" IN ('animals', 'species') AND NOT deleted
      LIMIT ${SYNC_LIMITS.graphRecords + 1}`;
  }

  async dependents(animalIds: string[]): Promise<TrackedRecord[]> {
    if (!animalIds.length) return [];
    return this.tx.$queryRaw<TrackedRecord[]>`SELECT * FROM sync_records
      WHERE "userId" = ${this.userId} AND NOT deleted AND (
        data->>'animalId' = ANY(${animalIds}::text[]) OR
        data->>'maleId' = ANY(${animalIds}::text[]) OR data->>'femaleId' = ANY(${animalIds}::text[]) OR
        data->>'offspringId' = ANY(${animalIds}::text[]) OR
        data->>'fatherId' = ANY(${animalIds}::text[]) OR data->>'motherId' = ANY(${animalIds}::text[]))
      LIMIT ${SYNC_LIMITS.pullRecords + 1}`;
  }

  async hasReceipt(hash: string): Promise<boolean> {
    const rows = await this.tx.$queryRaw<
      { hash: string }[]
    >`SELECT hash FROM sync_receipts WHERE "userId" = ${this.userId} AND hash = ${hash}`;
    return rows.length > 0;
  }

  async saveReceipt(hash: string): Promise<void> {
    await this.tx
      .$executeRaw`INSERT INTO sync_receipts ("userId", hash) VALUES (${this.userId}, ${hash}) ON CONFLICT DO NOTHING`;
  }

  async write(mutations: Mutation[]): Promise<void> {
    for (const table of SYNC_TABLES) {
      const records = mutations
        .filter((mutation) => mutation.table === table)
        .map(({ record }) => ({ ...record, userId: this.userId }));
      if (!records.length) continue;
      // Identifiers originate exclusively in the static server whitelist. Payloads are $1 values.
      const columns = ["id", "userId", ...Object.values(fields[table])];
      const quoted = columns.map((column) => `"${column}"`).join(", ");
      const updates =
        Object.values(fields[table])
          .map((column) => `"${column}" = EXCLUDED."${column}"`)
          .join(", ") +
        (table === "species"
          ? ""
          : `, "syncVersion" = "${table}"."syncVersion" + 1, "syncStatus" = 'SYNCED', "clientUpdatedAt" = CURRENT_TIMESTAMP`);
      await this.tx.$executeRawUnsafe(
        `INSERT INTO "${table}" (${quoted}, "updatedAt")
         SELECT ${quoted}, CURRENT_TIMESTAMP FROM jsonb_populate_recordset(NULL::"${table}", $1::jsonb)
         ON CONFLICT (id) DO UPDATE SET ${updates} WHERE "${table}"."userId" = EXCLUDED."userId"`,
        JSON.stringify(records),
      );
    }
  }

  async delete(table: SyncTable, ids: string[]): Promise<void> {
    if (!ids.length) return;
    if (table === "animals") {
      await this.tx
        .$executeRaw`UPDATE animals SET "deletedAt" = clock_timestamp(), "syncStatus" = 'DELETED'
        WHERE "userId" = ${this.userId} AND id = ANY(${ids}::text[]) AND "deletedAt" IS NULL`;
    } else if (table === "species") {
      await this.tx
        .$executeRaw`UPDATE species SET "deletedAt" = clock_timestamp()
        WHERE "userId" = ${this.userId} AND id = ANY(${ids}::text[]) AND "deletedAt" IS NULL`;
    } else {
      // The table comes from SYNC_TABLES, never from a request string.
      if (!SYNC_TABLES.includes(table))
        throw new ValidationError("Tabla no permitida");
      await this.tx.$executeRawUnsafe(
        `DELETE FROM "${table}" WHERE "userId" = $1 AND id = ANY($2::text[])`,
        this.userId,
        ids,
      );
    }
  }
}

@injectable()
export class WatermelonRepository implements IWatermelonRepository {
  async transaction<T>(
    userId: string,
    mode: "pull" | "push",
    work: (session: SyncSession) => Promise<T>,
  ): Promise<T> {
    try {
      return await prisma.$transaction(
        async (tx) => {
          // Pull's counter and rows share one MVCC snapshot, without blocking writers.
          const session = new PostgresSyncSession(tx, userId);
          return work(session);
        },
        {
          isolationLevel: mode === "pull" ? "RepeatableRead" : "ReadCommitted",
          timeout: 30000,
          maxWait: 10000,
        },
      );
    } catch (error) {
      const value = error as { code?: string; meta?: { code?: string } };
      if (
        ["P2034", "P2002", "P2003"].includes(value.code ?? "") ||
        ["40001", "40P01", "23505", "23503", "23514"].includes(
          value.meta?.code ?? "",
        )
      ) {
        throw new ConflictError(
          "Conflicto de sincronización; realiza pull y reintenta",
        );
      }
      throw error;
    }
  }
}
