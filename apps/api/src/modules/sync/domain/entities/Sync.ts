export enum SyncAction {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
}

export enum SyncStatus {
  PENDING = "PENDING",
  SYNCED = "SYNCED",
  CONFLICT = "CONFLICT",
}

export interface SyncLog {
  id: string;
  userId: string;
  action: SyncAction;
  tableName: string;
  recordId: string;
  data: any;
  status: SyncStatus;
  createdAt: Date;
}

export interface SyncPushData {
  userId: string;
  deviceId: string;
  changes: Array<{
    action: SyncAction;
    tableName: string;
    recordId: string;
    data: any;
    clientVersion: number;
  }>;
}

export interface SyncPullData {
  userId: string;
  deviceId: string;
  lastSyncAt?: string;
  tables: string[];
}

export interface SyncResult {
  success: boolean;
  conflicts?: Array<{
    tableName: string;
    recordId: string;
    serverVersion: any;
    clientVersion: any;
  }>;
  errors?: Array<{
    tableName: string;
    recordId: string;
    message: string;
  }>;
  syncedChanges: number;
}
