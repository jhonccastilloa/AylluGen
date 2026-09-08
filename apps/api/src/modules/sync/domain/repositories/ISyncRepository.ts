import { SyncLog } from "../entities/Sync";

export interface ISyncRepository {
  createLog(log: Omit<SyncLog, "id" | "createdAt">): Promise<SyncLog>;
  deleteLogs(userId: string, olderThan: Date): Promise<void>;
  findLatestSync(userId: string): Promise<Date | null>;
  saveLatestSync(userId: string, timestamp: Date): Promise<void>;
}

export interface ISyncService {
  pushChanges(data: any): Promise<any>;
  pullChanges(data: any): Promise<any>;
  resolveConflict(
    tableName: string,
    recordId: string,
    resolution: string,
  ): Promise<void>;
}
