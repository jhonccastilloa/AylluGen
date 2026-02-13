import { ApiService } from '@/infrastructure/api/ApiService';
import type {
  SyncPullPayload,
  SyncPullResult,
  SyncPushPayload,
  SyncPushResult,
} from '@/features/sync/interfaces/sync.types';
import type { DbTableName } from '@/infrastructure/database/constants';

interface ResolveConflictPayload {
  resolution: 'server' | 'client';
  tableName: DbTableName;
  recordId: string;
}

export class SyncApi {
  push(payload: SyncPushPayload): Promise<SyncPushResult> {
    return ApiService.post<SyncPushResult>('/sync/push', payload, {
      noLoader: true,
      showErrorToast: false,
    });
  }

  pull(payload: SyncPullPayload): Promise<SyncPullResult> {
    return ApiService.post<SyncPullResult>('/sync/pull', payload, {
      noLoader: true,
      showErrorToast: false,
    });
  }

  resolveConflict(payload: ResolveConflictPayload): Promise<void> {
    return ApiService.post<void>('/sync/resolve-conflict', payload, {
      noLoader: true,
      showErrorToast: false,
    });
  }
}

