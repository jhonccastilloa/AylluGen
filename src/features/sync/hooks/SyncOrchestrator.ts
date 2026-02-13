import { DB_TABLES, type DbTableName } from '@/infrastructure/database/constants';
import { extractApiErrorMessage } from '@/core/utils/apiErrorHandler';
import type { AnimalsLocalRepository } from '@/features/animals/services/AnimalsLocalRepository';
import type { BreedingsLocalRepository } from '@/features/breedings/services/BreedingsLocalRepository';
import type { HealthLocalRepository } from '@/features/health/services/HealthLocalRepository';
import type { ProductionLocalRepository } from '@/features/production/services/ProductionLocalRepository';
import { SyncApi } from '@/features/sync/services/SyncApi';
import { SyncQueueRepository } from '@/features/sync/services/SyncQueueRepository';
import type { SyncAction } from '@/features/sync/interfaces/sync.types';
import {
  consolidateSyncQueueEntries,
  toSyncEntryKey,
} from '@/features/sync/services/syncQueueCompactor';
import { useSyncStore } from '@/store/useSyncStore';
import { useNetworkStore } from '@/store/useNetworkStore';
import { NetworkUnavailableError } from '@/core/errors/NetworkUnavailableError';
import { AxiosError } from 'axios';

interface SyncOrchestratorDependencies {
  animalsLocalRepository: AnimalsLocalRepository;
  breedingsLocalRepository: BreedingsLocalRepository;
  healthLocalRepository: HealthLocalRepository;
  productionLocalRepository: ProductionLocalRepository;
  syncQueueRepository: SyncQueueRepository;
  syncApi: SyncApi;
}

export class SyncOrchestrator {
  private isRunning = false;
  private consecutiveFailures = 0;
  private nextRetryAt = 0;
  private readonly baseRetryDelayMs = 5_000;
  private readonly maxRetryDelayMs = 5 * 60_000;

  constructor(private readonly deps: SyncOrchestratorDependencies) {}

  private markSyncSuccess(): void {
    this.consecutiveFailures = 0;
    this.nextRetryAt = 0;
  }

  private markSyncFailure(): void {
    this.consecutiveFailures += 1;

    const exponentialDelay = Math.min(
      this.maxRetryDelayMs,
      this.baseRetryDelayMs * 2 ** (this.consecutiveFailures - 1),
    );
    const jitter = Math.floor(Math.random() * 1_000);
    this.nextRetryAt = Date.now() + exponentialDelay + jitter;
  }

  async hydrateSyncState(): Promise<void> {
    const [pendingCount, lastSyncAt] = await Promise.all([
      this.deps.syncQueueRepository.pendingCount(),
      this.deps.syncQueueRepository.getLastSyncAt(),
    ]);
    useSyncStore.getState().setPendingChanges(pendingCount);
    useSyncStore.getState().setLastSyncAt(lastSyncAt);
  }

  async enqueueChange(
    tableName: DbTableName,
    action: SyncAction,
    recordId: string,
    payload: Record<string, unknown> | null,
    clientVersion: number,
  ): Promise<void> {
    await this.deps.syncQueueRepository.enqueue(
      tableName,
      action,
      recordId,
      payload,
      clientVersion,
    );
    const pendingCount = await this.deps.syncQueueRepository.pendingCount();
    useSyncStore.getState().setPendingChanges(pendingCount);
  }

  async syncNow(userId: string): Promise<void> {
    if (!userId || this.isRunning) return;
    if (this.nextRetryAt > Date.now()) return;

    const networkState = useNetworkStore.getState();
    if (networkState.isInitialized && !networkState.isOnline) {
      useSyncStore.getState().setStatus('offline');
      useSyncStore.getState().setError(undefined);
      return;
    }

    this.isRunning = true;
    useSyncStore.getState().setStatus('syncing');
    useSyncStore.getState().setError(undefined);

    try {
      const deviceId = await this.deps.syncQueueRepository.getOrCreateDeviceId();
      const pendingEntries = consolidateSyncQueueEntries(
        await this.deps.syncQueueRepository.listPending(),
      );
      let pendingPushError: string | undefined;

      if (pendingEntries.length > 0) {
        const pushResult = await this.deps.syncApi.push({
          userId,
          deviceId,
          changes: pendingEntries.map(entry => ({
            action: entry.action,
            tableName: entry.tableName,
            recordId: entry.recordId,
            data: entry.payload ?? {},
            clientVersion: entry.clientVersion,
          })),
        });

        const conflictKeys = new Set(
          (pushResult.conflicts ?? []).map(conflict =>
            toSyncEntryKey(conflict.tableName, conflict.recordId),
          ),
        );
        const errorKeys = new Set(
          (pushResult.errors ?? []).map(syncError =>
            toSyncEntryKey(syncError.tableName, syncError.recordId),
          ),
        );
        const pendingEntryKeys = new Set(
          pendingEntries.map(entry => toSyncEntryKey(entry.tableName, entry.recordId)),
        );
        const knownErrorKeys = new Set(
          [...errorKeys].filter(errorKey => pendingEntryKeys.has(errorKey)),
        );
        const knownConflictKeys = new Set(
          [...conflictKeys].filter(conflictKey => pendingEntryKeys.has(conflictKey)),
        );

        if (knownConflictKeys.size > 0) {
          await Promise.all(
            pendingEntries
              .filter(entry =>
                knownConflictKeys.has(
                  toSyncEntryKey(entry.tableName, entry.recordId),
                ),
              )
              .map(entry =>
                this.deps.syncApi.resolveConflict({
                  resolution: 'server',
                  tableName: entry.tableName,
                  recordId: entry.recordId,
                }),
              ),
          );
        }

        const entryIdsToClear = pendingEntries
          .filter(entry => {
            const entryKey = toSyncEntryKey(entry.tableName, entry.recordId);
            if (knownErrorKeys.has(entryKey)) return false;
            return true;
          })
          .flatMap(entry => entry.sourceEntryIds);

        if (entryIdsToClear.length > 0) {
          await this.deps.syncQueueRepository.clearByIds(entryIdsToClear);
        }

        if (!pushResult.success || errorKeys.size > 0) {
          pendingPushError =
            pushResult.errors?.[0]?.message ??
            'No se pudo sincronizar la cola de cambios pendientes';
        }
      }

      const lastSyncAt = await this.deps.syncQueueRepository.getLastSyncAt();
      const pullResult = await this.deps.syncApi.pull({
        userId,
        deviceId,
        lastSyncAt,
        tables: [
          DB_TABLES.animals,
          DB_TABLES.breedings,
          DB_TABLES.healthRecords,
          DB_TABLES.productionRecords,
        ],
      });

      await Promise.all([
        this.deps.animalsLocalRepository.upsertFromServer(pullResult.animals ?? []),
        this.deps.breedingsLocalRepository.upsertFromServer(
          pullResult.breedings ?? [],
        ),
        this.deps.healthLocalRepository.upsertFromServer(
          pullResult.healthRecords ?? [],
        ),
        this.deps.productionLocalRepository.upsertFromServer(
          pullResult.productionRecords ?? [],
        ),
      ]);

      await this.deps.syncQueueRepository.setLastSyncAt(pullResult.syncTimestamp);
      await this.hydrateSyncState();

      if (pendingPushError) {
        this.markSyncFailure();
        useSyncStore.getState().setStatus('error');
        useSyncStore.getState().setError(pendingPushError);
        return;
      }

      this.markSyncSuccess();
      useSyncStore.getState().setStatus('idle');
    } catch (error) {
      const isTransportError =
        error instanceof AxiosError && Boolean(error.request) && !error.response;
      if (error instanceof NetworkUnavailableError || isTransportError) {
        this.markSyncSuccess();
        useSyncStore.getState().setStatus('offline');
        useSyncStore.getState().setError(undefined);
        return;
      }

      this.markSyncFailure();
      useSyncStore.getState().setStatus('error');
      useSyncStore.getState().setError(extractApiErrorMessage(error));
    } finally {
      try {
        await this.hydrateSyncState();
      } catch {
        // Keep sync orchestration resilient even if local state hydration fails.
      }
      this.isRunning = false;
    }
  }
}

