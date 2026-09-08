import { Mutation, SyncTable, TrackedRecord } from "../entities/Watermelon";

export const TYPE_IWatermelonRepository = Symbol("IWatermelonRepository");
export interface SyncSession {
  checkpoint(lock?: boolean): Promise<bigint>;
  changesSince(
    checkpoint: bigint,
    fullTables: SyncTable[],
  ): Promise<TrackedRecord[]>;
  recordsByIds(ids: string[]): Promise<TrackedRecord[]>;
  graph(): Promise<TrackedRecord[]>;
  dependents(animalIds: string[]): Promise<TrackedRecord[]>;
  hasReceipt(hash: string): Promise<boolean>;
  saveReceipt(hash: string): Promise<void>;
  write(mutations: Mutation[]): Promise<void>;
  delete(table: SyncTable, ids: string[]): Promise<void>;
}
export interface IWatermelonRepository {
  transaction<T>(
    userId: string,
    mode: "pull" | "push",
    work: (session: SyncSession) => Promise<T>,
  ): Promise<T>;
}
