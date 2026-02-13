import type { DbTableName } from '@/infrastructure/database/constants';
import type { Animal } from '@/features/animals/interfaces/animals.types';
import type { Breeding } from '@/features/breedings/interfaces/breedings.types';
import type { HealthRecord } from '@/features/health/interfaces/health.types';
import type { ProductionRecord } from '@/features/production/interfaces/production.types';

export type SyncAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface SyncQueueEntry {
  id: string;
  tableName: DbTableName;
  recordId: string;
  action: SyncAction;
  payload: Record<string, unknown> | null;
  clientVersion: number;
  createdAt: number;
}

export interface SyncPushPayload {
  userId: string;
  deviceId: string;
  changes: Array<{
    action: SyncAction;
    tableName: DbTableName;
    recordId: string;
    data: Record<string, unknown>;
    clientVersion: number;
  }>;
}

export interface SyncPushResult {
  success: boolean;
  syncedChanges: number;
  conflicts?: Array<{
    tableName: DbTableName;
    recordId: string;
    serverVersion: unknown;
    clientVersion: unknown;
  }>;
  errors?: Array<{
    tableName: DbTableName;
    recordId: string;
    message: string;
  }>;
}

export interface SyncPullPayload {
  userId: string;
  deviceId: string;
  lastSyncAt?: string;
  tables: DbTableName[];
}

export interface SyncPullResult {
  animals?: Animal[];
  breedings?: Breeding[];
  healthRecords?: HealthRecord[];
  productionRecords?: ProductionRecord[];
  syncTimestamp: string;
}

