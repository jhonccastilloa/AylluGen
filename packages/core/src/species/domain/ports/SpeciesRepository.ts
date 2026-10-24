import type { SpeciesData, SpeciesFields } from "../types/Species";

/** One owner per repository instance. Queries exclude deleted records. */
export interface SpeciesRepository<T extends SpeciesData = SpeciesData> {
  readonly ownerId: string;
  list(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  findByCode(code: string): Promise<T | null>;
  findConflict(
    fields: SpeciesFields,
    exceptId?: string,
  ): Promise<"code" | "name" | null>;
  hasAnimals(speciesId: string): Promise<boolean>;
  insert(id: string, fields: SpeciesFields): Promise<T>;
  findOrInsertByCode(id: string, fields: SpeciesFields): Promise<T>;
  update(id: string, fields: SpeciesFields, previous: SpeciesFields): Promise<T>;
  delete(id: string): Promise<void>;
}
