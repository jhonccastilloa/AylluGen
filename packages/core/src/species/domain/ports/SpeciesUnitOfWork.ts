import type { SpeciesData } from "../types/Species";
import type { SpeciesRepository } from "./SpeciesRepository";
import type { SpeciesUsage } from "./SpeciesUsage";

export interface SpeciesSession<T extends SpeciesData = SpeciesData> {
  species: SpeciesRepository<T>;
  usage: SpeciesUsage;
}

/**
 * Adapters serialize validation with persistence. Finish validation before
 * mutation: a Watermelon writer does not provide SQL-style rollback.
 */
export interface SpeciesUnitOfWork<T extends SpeciesData = SpeciesData> {
  read<R>(
    ownerId: string,
    work: (session: SpeciesSession<T>) => Promise<R>,
  ): Promise<R>;
  write<R>(
    ownerId: string,
    work: (session: SpeciesSession<T>) => Promise<R>,
  ): Promise<R>;
}
export type SpeciesIdGenerator = () => string;
