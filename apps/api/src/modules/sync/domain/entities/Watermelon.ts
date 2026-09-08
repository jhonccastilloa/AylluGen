export const SYNC_TABLES = [
  "species",
  "animals",
  "breedings",
  "health_records",
  "production_records",
] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];
export type RawRecord = { id: string } & Record<
  string,
  string | number | boolean | null
>;
export type RecordData = Record<string, unknown>;
export interface TableChanges {
  created: RawRecord[];
  updated: RawRecord[];
  deleted: string[];
}
export type Changes = Record<SyncTable, TableChanges>;
export interface TrackedRecord {
  tableName: SyncTable;
  recordId: string;
  userId: string;
  createdVersion: bigint;
  version: bigint;
  deleted: boolean;
  data: RecordData | null;
}
export interface Mutation {
  table: SyncTable;
  record: RecordData & { id: string };
}
export const SYNC_LIMITS = {
  pushRecords: 500,
  pullRecords: 20000,
  graphRecords: 10000,
  responseBytes: 16 * 1024 * 1024,
};
export const emptyChanges = (): Changes =>
  Object.fromEntries(
    SYNC_TABLES.map((table) => [
      table,
      { created: [], updated: [], deleted: [] },
    ]),
  ) as unknown as Changes;
