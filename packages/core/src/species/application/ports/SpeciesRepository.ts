import type { SpeciesData, SpeciesFields } from "../../domain/types/Species";

/** One owner per repository instance. Queries exclude deleted records. */
export interface SpeciesRepository<T extends SpeciesData = SpeciesData> {
  list(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  findByCode(code: string): Promise<T | null>;
  findConflict(
    fields: SpeciesFields,
    exceptId?: string,
  ): Promise<"code" | "name" | null>;
  insert(id: string, fields: SpeciesFields): Promise<T>;
  update(id: string, fields: SpeciesFields): Promise<T>;
  delete(id: string): Promise<void>;
}
