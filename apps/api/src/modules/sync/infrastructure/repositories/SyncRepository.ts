import { injectable } from "inversify";
import { prisma } from "../../../../infrastructure/database/prisma/client";
import {
  SyncLog,
  SyncAction,
  SyncStatus,
} from "../../../sync/domain/entities/Sync";
import { ISyncRepository } from "../../../sync/domain/repositories/ISyncRepository";

@injectable()
export class SyncRepository implements ISyncRepository {
  async createLog(log: Omit<SyncLog, "id" | "createdAt">): Promise<SyncLog> {
    const syncLog = await prisma.syncLog.create({
      data: log,
    });

    return this.mapToEntity(syncLog);
  }

  async deleteLogs(userId: string, olderThan: Date): Promise<void> {
    await prisma.syncLog.deleteMany({
      where: { userId, createdAt: { lt: olderThan } },
    });
  }

  async findLatestSync(userId: string): Promise<Date | null> {
    const latestLog = await prisma.syncLog.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return latestLog?.createdAt || null;
  }

  async saveLatestSync(userId: string, timestamp: Date): Promise<void> {
    await prisma.syncLog.create({
      data: {
        userId,
        action: SyncAction.UPDATE,
        tableName: "_sync_meta",
        recordId: `${userId}-sync`,
        data: { timestamp },
        status: SyncStatus.SYNCED,
      },
    });
  }

  private mapToEntity(data: any): SyncLog {
    return {
      id: data.id,
      userId: data.userId,
      action: data.action as SyncAction,
      tableName: data.tableName,
      recordId: data.recordId,
      data: data.data,
      status: data.status as SyncStatus,
      createdAt: data.createdAt,
    };
  }
}
