import { inject, injectable } from "inversify";
import { createHash } from "node:crypto";
import {
  TYPE_IWatermelonRepository,
  IWatermelonRepository,
  SyncSession,
} from "../../domain/repositories/IWatermelonRepository";
import {
  Changes,
  emptyChanges,
  Mutation,
  RawRecord,
  RecordData,
  SYNC_LIMITS,
  SYNC_TABLES,
  SyncTable,
  TrackedRecord,
} from "../../domain/entities/Watermelon";
import {
  toDatabase,
  toRaw,
  WatermelonPull,
  WatermelonPush,
} from "../schemas/watermelon.schema";
import {
  AuthorizationError,
  ConflictError,
  ValidationError,
  AppError,
} from "../../../../shared/errors/AppError";
import {
  RelatedAnimal,
  validateParents,
} from "../../../animal/domain/services/AnimalRules";
import { logger } from "../../../../shared/logging";

export class SyncScopeError extends AppError {
  constructor() {
    super(
      "Dataset demasiado grande; se requiere un scope local menor. No avances el checkpoint.",
      413,
      "SYNC_SCOPE_TOO_LARGE",
      "SyncScopeError",
    );
  }
}
const key = (table: SyncTable, id: string) => `${table}:${id}`;
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as RecordData)[k])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

@injectable()
export class WatermelonService {
  constructor(
    @inject(TYPE_IWatermelonRepository)
    private repository: IWatermelonRepository,
  ) {}

  async pull(
    userId: string,
    input: WatermelonPull,
  ): Promise<{ changes: Changes; timestamp: number }> {
    return this.observe("pull", userId, input.lastPulledAt, async () =>
      this.repository.transaction(userId, "pull", async (session) => {
        const timestamp = await session.checkpoint();
        const since = BigInt(input.lastPulledAt ?? 0);
        this.validateCheckpoint(since, timestamp);
        const fullTables = [
          ...new Set([
            ...(input.migration?.tables ?? []),
            ...(input.migration?.columns.map((item) => item.table) ?? []),
          ]),
        ];
        const rows = await session.changesSince(since, fullTables);
        if (rows.length > SYNC_LIMITS.pullRecords) throw new SyncScopeError();
        const changes = emptyChanges();
        for (const row of rows) {
          if (row.deleted) changes[row.tableName].deleted.push(row.recordId);
          else if (row.data) {
            const created =
              since === 0n ||
              row.createdVersion > since ||
              (input.migration?.tables.includes(row.tableName) ?? false);
            changes[row.tableName][created ? "created" : "updated"].push(
              toRaw(row.tableName, row.data),
            );
          }
        }
        const response = { changes, timestamp: Number(timestamp) };
        if (
          Buffer.byteLength(JSON.stringify(response)) >
          SYNC_LIMITS.responseBytes
        )
          throw new SyncScopeError();
        return response;
      }),
    );
  }

  async push(userId: string, input: WatermelonPush): Promise<void> {
    await this.observe(
      "push",
      userId,
      input.lastPulledAt,
      async () =>
        this.repository.transaction(userId, "push", async (session) => {
          const checkpoint = await session.checkpoint(true);
          const since = BigInt(input.lastPulledAt);
          this.validateCheckpoint(since, checkpoint);
          // Include checkpoint and normalized business data: a lost HTTP response can be
          // retried without applying the batch again, even if another device has since edited it.
          const changes = this.normalize(input);
          const hash = createHash("sha256")
            .update(canonical({ since: input.lastPulledAt, changes }))
            .digest("hex");
          if (await session.hasReceipt(hash)) return;
          const allIds = SYNC_TABLES.flatMap((table) => [
            ...changes[table].created.map((r) => r.id),
            ...changes[table].updated.map((r) => r.id),
            ...changes[table].deleted,
          ]);
          if (!allIds.length) return;
          const existing = new Map(
            (await session.recordsByIds([...new Set(allIds)])).map((row) => [
              key(row.tableName, row.recordId),
              row,
            ]),
          );
          const mutations: Mutation[] = [];
          for (const table of SYNC_TABLES) {
            for (const record of [
              ...changes[table].created,
              ...changes[table].updated,
            ]) {
              const row = existing.get(key(table, record.id));
              this.assertOwnership(row, userId);
              if (row?.deleted || (row && row.version > since))
                throw new ConflictError(
                  "Registro modificado o eliminado; realiza pull y reintenta",
                );
              mutations.push({ table, record: toDatabase(table, record) });
            }
            for (const id of changes[table].deleted) {
              const row = existing.get(key(table, id));
              this.assertOwnership(row, userId);
              if (row && !row.deleted && row.version > since)
                throw new ConflictError(
                  "Registro modificado antes de eliminar; realiza pull y reintenta",
                );
            }
          }
          await this.validateBatch(session, userId, since, changes, mutations);
          // Rows deleted by this same batch must not be reintroduced by an upsert.
          await session.write(mutations);
          // Dependents before parents; triggers also catch descendants omitted by clients.
          for (const table of [...SYNC_TABLES].reverse())
            await session.delete(table, changes[table].deleted);
          await session.saveReceipt(hash);
        }),
      input.changes,
    );
  }

  private normalize(input: WatermelonPush): Changes {
    const changes = emptyChanges();
    for (const table of SYNC_TABLES) {
      const inputChanges = input.changes[table];
      if (!inputChanges) continue;
      // Strip server dates and Watermelon internals before both hashing and persistence.
      for (const operation of ["created", "updated"] as const) {
        changes[table][operation] = inputChanges[operation]
          .map((value) => {
            const { _status, _changed, created_at, updated_at, ...record } =
              value;
            return record as RawRecord;
          })
          .sort((a, b) => a.id.localeCompare(b.id));
      }
      changes[table].deleted = [...inputChanges.deleted].sort();
    }
    return changes;
  }

  private async validateBatch(
    session: SyncSession,
    userId: string,
    since: bigint,
    changes: Changes,
    mutations: Mutation[],
  ): Promise<void> {
    const graphRows = await session.graph();
    if (graphRows.length > SYNC_LIMITS.graphRecords) throw new SyncScopeError();
    const graph = new Map(
      graphRows.map((row) => [
        key(row.tableName, row.recordId),
        row.data! as RecordData & { id: string },
      ]),
    );
    for (const mutation of mutations)
      if (["animals", "species"].includes(mutation.table))
        graph.set(key(mutation.table, mutation.record.id), {
          ...mutation.record,
          userId,
        });
    const deletingAnimals = new Set(changes.animals.deleted);
    const deletingSpecies = new Set(changes.species.deleted);
    const animal = (id: unknown): RelatedAnimal | null =>
      typeof id === "string" && !deletingAnimals.has(id)
        ? ((graph.get(key("animals", id)) as unknown as RelatedAnimal) ?? null)
        : null;
    const requireAnimal = (id: unknown): RelatedAnimal => {
      const record = animal(id);
      if (!record)
        throw new ValidationError(
          "El animal relacionado no está disponible para este usuario",
        );
      return record;
    };
    for (const mutation of mutations) {
      const data = mutation.record;
      if (mutation.table === "animals") {
        if (
          !graph.has(key("species", data.speciesId as string)) ||
          deletingSpecies.has(data.speciesId as string)
        )
          throw new ValidationError("Especie no disponible para este usuario");
        validateParents(
          {
            userId,
            childId: data.id,
            childSpeciesId: data.speciesId as string,
            fatherId: data.fatherId as string | null,
            motherId: data.motherId as string | null,
          },
          animal(data.fatherId),
          animal(data.motherId),
        );
      }
      if (
        mutation.table === "health_records" ||
        mutation.table === "production_records"
      )
        requireAnimal(data.animalId);
      if (mutation.table === "breedings") {
        const male = requireAnimal(data.maleId);
        const female = requireAnimal(data.femaleId);
        if (
          male.sex !== "MALE" ||
          female.sex !== "FEMALE" ||
          male.speciesId !== female.speciesId
        )
          throw new ValidationError("Cruzamiento incompatible");
        if (
          data.offspringId &&
          requireAnimal(data.offspringId).speciesId !== male.speciesId
        )
          throw new ValidationError("Cría de especie incompatible");
      }
    }
    // Validate inverse relationships too (e.g. changing the species/sex of an existing parent).
    for (const [recordKey, data] of graph) {
      if (!recordKey.startsWith("animals:") || deletingAnimals.has(data.id))
        continue;
      if (deletingSpecies.has(data.speciesId as string))
        throw new ValidationError(
          "No se puede eliminar una especie con animales asociados",
        );
      const fatherId = deletingAnimals.has(data.fatherId as string)
        ? null
        : (data.fatherId as string | null);
      const motherId = deletingAnimals.has(data.motherId as string)
        ? null
        : (data.motherId as string | null);
      validateParents(
        {
          userId,
          childId: data.id,
          childSpeciesId: data.speciesId as string,
          fatherId,
          motherId,
        },
        animal(fatherId),
        animal(motherId),
      );
    }
    // Iterative DFS: batches may reference parents later in the same request, but not form cycles.
    const done = new Set<string>();
    for (const [recordKey, data] of graph) {
      if (
        !recordKey.startsWith("animals:") ||
        deletingAnimals.has(data.id) ||
        done.has(data.id)
      )
        continue;
      const visiting = new Set<string>();
      const stack: { id: string; exit: boolean }[] = [
        { id: data.id, exit: false },
      ];
      while (stack.length) {
        const current = stack.pop()!;
        if (current.exit) {
          visiting.delete(current.id);
          done.add(current.id);
          continue;
        }
        if (visiting.has(current.id))
          throw new ValidationError("El parentesco contiene un ciclo");
        if (done.has(current.id) || deletingAnimals.has(current.id)) continue;
        const node = graph.get(key("animals", current.id));
        if (!node) continue;
        visiting.add(current.id);
        stack.push({ id: current.id, exit: true });
        for (const id of [node.fatherId, node.motherId])
          if (typeof id === "string") stack.push({ id, exit: false });
      }
    }
    const dependents = await session.dependents([...deletingAnimals]);
    if (dependents.length > SYNC_LIMITS.pullRecords) throw new SyncScopeError();
    // Cascades are writes too; never silently delete a descendant newer than the client's pull.
    if (dependents.some((row) => row.version > since))
      throw new ConflictError(
        "Un registro dependiente cambió; realiza pull y reintenta",
      );
  }

  private assertOwnership(
    row: TrackedRecord | undefined,
    userId: string,
  ): void {
    if (row && row.userId !== userId)
      throw new AuthorizationError("Registro no disponible");
  }
  private validateCheckpoint(since: bigint, current: bigint): void {
    if (since > current)
      throw new ValidationError("Checkpoint futuro o de otra cuenta");
  }

  private async observe<T>(
    operation: string,
    userId: string,
    lastPulledAt: number | null,
    work: () => Promise<T>,
    changes?: WatermelonPush["changes"],
  ): Promise<T> {
    const start = Date.now();
    const counts = (value: WatermelonPush["changes"]) =>
      Object.fromEntries(
        Object.entries(value).map(([table, rows]) => [
          table,
          {
            created: rows?.created.length ?? 0,
            updated: rows?.updated.length ?? 0,
            deleted: rows?.deleted.length ?? 0,
          },
        ]),
      );
    logger.info("sync.started", {
      operation,
      userId,
      lastPulledAt,
      counts: changes && counts(changes),
    });
    try {
      const result = await work();
      const pull = result as { changes?: Changes } | undefined;
      logger.info("sync.completed", {
        operation,
        userId,
        lastPulledAt,
        durationMs: Date.now() - start,
        counts: pull?.changes
          ? counts(pull.changes)
          : changes && counts(changes),
      });
      return result;
    } catch (error) {
      logger.warn("sync.failed", {
        operation,
        userId,
        lastPulledAt,
        durationMs: Date.now() - start,
        code: error instanceof AppError ? error.code : "SYNC_INTERNAL_ERROR",
      });
      throw error;
    }
  }
}
