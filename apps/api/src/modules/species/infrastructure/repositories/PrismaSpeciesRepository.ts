import type { ISpeciesRepository } from "@ayllugen/core/species/repository";
import { SpeciesError } from "@ayllugen/core/species/errors";
import { assertSpecieUnused } from "@ayllugen/core/species/deletion-policy";
import type { ISpeciesData } from "@ayllugen/core/species/types";
import type { ISpeciesFields } from "@ayllugen/core/species/entity";
import {
  prisma,
  type PrismaTransaction,
} from "../../../../infrastructure/database/prisma/client";
import {
  AuthenticationError,
  ConflictError,
} from "../../../../shared/errors/AppError";

/** Scoped to one owner; each mutation performs its checks under the sync account lock. */
export class PrismaSpeciesRepository implements ISpeciesRepository {
  constructor(
    public readonly ownerId: string,
    private readonly db: PrismaTransaction = prisma,
  ) {}
  private get active() {
    return { userId: this.ownerId, deletedAt: null };
  }
  list(): Promise<ISpeciesData[]> {
    return this.db.species.findMany({
      where: this.active,
      orderBy: { name: "asc" },
    });
  }
  findById(id: string): Promise<ISpeciesData | null> {
    return this.db.species.findFirst({ where: { ...this.active, id } });
  }
  findByName(name: string): Promise<ISpeciesData | null> {
    return this.db.species.findFirst({ where: { ...this.active, name: { equals: name, mode: "insensitive" } } });
  }
  async findConflict(
    fields: ISpeciesFields,
    exceptId?: string,
  ): Promise<"name" | null> {
    // SQL currently reserves keys even after soft deletion; do not change that policy.
    const rows = await this.db.species.findMany({
      where: {
        userId: this.ownerId,
        ...(exceptId ? { id: { not: exceptId } } : {}),
        name: { equals: fields.name, mode: "insensitive" },
      },
      select: { id: true },
    });
    return rows.length ? "name" : null;
  }

  private async write<R>(
    work: (repository: PrismaSpeciesRepository) => Promise<R>,
  ): Promise<R> {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const clocks = await tx.$queryRaw<{ version: bigint }[]>`
          SELECT version FROM sync_clocks WHERE "userId" = ${this.ownerId} FOR UPDATE`;
          if (!clocks.length)
            throw new AuthenticationError("Cuenta no disponible");
          return work(new PrismaSpeciesRepository(this.ownerId, tx));
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

  private conflict(field: "name"): never {
    throw new SpeciesError(
      "SPECIES_DUPLICATE",
      "Ya existe una especie con ese nombre.",
    );
  }

  private createRow(id: string, fields: ISpeciesFields): Promise<ISpeciesData> {
    return this.db.species.create({
      data: { id, userId: this.ownerId, ...fields },
    });
  }

  async insert(id: string, fields: ISpeciesFields): Promise<ISpeciesData> {
    return this.write(async (repository) => {
      const conflict = await repository.findConflict(fields);
      if (conflict) repository.conflict(conflict);
      return repository.createRow(id, fields);
    });
  }

  async findOrInsertByName(
    id: string,
    fields: ISpeciesFields,
  ): Promise<ISpeciesData> {
    return this.write(async (repository) => {
      const existing = await repository.findByName(fields.name);
      if (existing) return existing;
      const conflict = await repository.findConflict(fields);
      if (conflict) repository.conflict(conflict);
      return repository.createRow(id, fields);
    });
  }

  async update(
    id: string,
    fields: ISpeciesFields,
    previous: ISpeciesFields,
  ): Promise<ISpeciesData> {
    return this.write(async (repository) => {
      const current = await repository.findById(id);
      if (!current)
        throw new SpeciesError("SPECIES_NOT_FOUND", "Especie no encontrada.");
      if (
        current.name !== previous.name ||
        current.description !== previous.description
      )
        throw new SpeciesError(
          "SPECIES_CONFLICT",
          "La especie cambió durante la edición. Reintenta la operación.",
        );
      const conflict = await repository.findConflict(fields, id);
      if (conflict) repository.conflict(conflict);
      return repository.db.species.update({
        where: { id, ...this.active },
        // REST originates on the server; push keeps the device action dates.
        data: {
          name: fields.name,
          description: fields.description,
          clientUpdatedAt: new Date(),
        },
      });
    });
  }
  async delete(id: string): Promise<void> {
    await this.write(async (repository) => {
      if (!(await repository.findById(id)))
        throw new SpeciesError("SPECIES_NOT_FOUND", "Especie no encontrada.");
      assertSpecieUnused(await repository.hasAnimals(id));
      await repository.db.species.update({
        where: { id, ...repository.active },
        data: { deletedAt: new Date() },
      });
    });
  }
  async hasAnimals(speciesId: string): Promise<boolean> {
    return (
      (await this.db.animal.count({ where: { ...this.active, speciesId } })) > 0
    );
  }
}
