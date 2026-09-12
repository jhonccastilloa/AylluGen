import type { SpeciesRepository } from "@ayllugen/core/species/repository";
import type { SpeciesUsage } from "@ayllugen/core/species/usage";
import type { SpeciesFields } from "@ayllugen/core/species/types";
import type { PrismaTransaction } from "../../../../infrastructure/database/prisma/client";
import type { SpeciesRecord } from "../../application/SpeciesRecord";

/** Scoped to one transaction and owner; no global mutable transaction client. */
export class PrismaSpeciesRepository
  implements SpeciesRepository<SpeciesRecord>, SpeciesUsage
{
  constructor(
    private readonly db: PrismaTransaction,
    private readonly ownerId: string,
  ) {}
  private get active() {
    return { userId: this.ownerId, deletedAt: null };
  }
  list(): Promise<SpeciesRecord[]> {
    return this.db.species.findMany({
      where: this.active,
      orderBy: { name: "asc" },
    });
  }
  findById(id: string): Promise<SpeciesRecord | null> {
    return this.db.species.findFirst({ where: { ...this.active, id } });
  }
  findByCode(code: string): Promise<SpeciesRecord | null> {
    return this.db.species.findFirst({ where: { ...this.active, code } });
  }
  async findConflict(
    fields: SpeciesFields,
    exceptId?: string,
  ): Promise<"code" | "name" | null> {
    // SQL currently reserves keys even after soft deletion; do not change that policy.
    const rows = await this.db.species.findMany({
      where: {
        userId: this.ownerId,
        ...(exceptId ? { id: { not: exceptId } } : {}),
        OR: [{ code: fields.code }, { name: fields.name }],
      },
      select: { code: true },
    });
    if (rows.some((row) => row.code === fields.code)) return "code";
    return rows.length ? "name" : null;
  }
  insert(id: string, fields: SpeciesFields): Promise<SpeciesRecord> {
    return this.db.species.create({
      data: {
        id,
        userId: this.ownerId,
        code: fields.code,
        name: fields.name,
        description: fields.description,
      },
    });
  }
  update(id: string, fields: SpeciesFields): Promise<SpeciesRecord> {
    return this.db.species.update({
      where: { id, ...this.active },
      // REST originates on the server; push keeps the device action dates.
      data: {
        code: fields.code,
        name: fields.name,
        description: fields.description,
        clientUpdatedAt: new Date(),
      },
    });
  }
  async delete(id: string): Promise<void> {
    await this.db.species.update({
      where: { id, ...this.active },
      data: { deletedAt: new Date() },
    });
  }
  async hasAnimals(speciesId: string): Promise<boolean> {
    return (
      (await this.db.animal.count({ where: { ...this.active, speciesId } })) > 0
    );
  }
}
