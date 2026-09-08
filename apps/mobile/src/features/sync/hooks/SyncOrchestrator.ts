import { Q, type Database } from '@nozbe/watermelondb';
import { synchronize } from '@nozbe/watermelondb/sync';
import type { Subscription } from 'rxjs';
import authSession from '@/infrastructure/auth/AuthSession';
import { useNetworkStore } from '@/store/useNetworkStore';
import { useSyncStore } from '@/store/useSyncStore';
import { reconcileLegacyFirstPull } from '@/infrastructure/database/importLegacy';
import {
  SYNC_TABLES,
  changeCounts,
  SyncValidationError,
} from '../services/watermelonProtocol';
import type { SyncApi } from '../services/SyncApi';

export const errorStatus = (error: unknown): number | undefined => {
  const e = error as {
    status?: number;
    response?: { status?: number };
    name?: string;
  };
  return (
    e?.response?.status ??
    e?.status ??
    (e?.name === 'ZodError' ? 400 : undefined)
  );
};

export class SyncOrchestrator {
  private flight?: Promise<void>;
  private timer?: ReturnType<typeof setTimeout>;
  private subscription?: Subscription;
  private active = false;
  private failures = 0;
  private lastSuccess = 0;

  constructor(
    private readonly database: Database,
    private readonly userId: string,
    private readonly api: SyncApi,
    private readonly ready: Promise<void>,
  ) {}

  private ownsSession() {
    return authSession.getUser()?.id === this.userId;
  }
  private online() {
    const state = useNetworkStore.getState();
    return !state.isInitialized || state.isOnline;
  }
  private assertSession() {
    if (!this.ownsSession())
      throw new Error('La cuenta cambió durante la sincronización.');
  }

  async hydrateSyncState(): Promise<number> {
    await this.ready;
    const counts = await Promise.all(
      SYNC_TABLES.map(async table => {
        const [dirty, deleted] = await Promise.all([
          this.database
            .get(table)
            .query(Q.where('_status', Q.oneOf(['created', 'updated'])))
            .fetchCount(),
          this.database.adapter.getDeletedRecords(table),
        ]);
        return dirty + deleted.length;
      }),
    );
    const pending = counts.reduce((sum, n) => sum + n, 0);
    const lastSuccess = await this.database.adapter.getLocal(
      'sync_display_last_success',
    );
    if (this.ownsSession()) {
      useSyncStore.getState().setPendingChanges(pending);
      useSyncStore.getState().setLastSyncAt(lastSuccess);
    }
    return pending;
  }

  start() {
    this.stop();
    this.failures = 0; // a new foreground/connectivity event starts a fresh retry budget
    this.active = true;
    this.subscription = this.database
      .withChangesForTables([...SYNC_TABLES])
      .subscribe(() => {
        if (this.flight) return;
        this.hydrateSyncState()
          .then(count => {
            if (count) this.schedule();
          })
          .catch(() => {});
      });
    this.requestFreshness();
  }

  stop() {
    this.active = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    this.subscription?.unsubscribe();
    this.subscription = undefined;
  }

  requestFreshness() {
    this.hydrateSyncState()
      .then(count => {
        if (count || Date.now() - this.lastSuccess >= 60000) this.schedule(0);
      })
      .catch(() => {});
  }

  schedule(delay = 800) {
    if (!this.active || !this.ownsSession() || !this.online()) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.syncNow(this.userId).catch(() => {});
    }, delay);
  }

  syncNow(userId: string): Promise<void> {
    if (userId !== this.userId || !this.ownsSession())
      return Promise.reject(new Error('Cuenta de sincronización inválida.'));
    if (this.flight) return this.flight;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    if (!this.online()) {
      useSyncStore.getState().setStatus('offline');
      return this.hydrateSyncState().then(() => {});
    }
    this.flight = this.run().finally(() => {
      this.flight = undefined;
    });
    return this.flight;
  }

  private async run() {
    const state = useSyncStore.getState();
    const started = Date.now();
    state.setStatus('syncing');
    state.setError(undefined);
    console.info('sync.start', { userId: this.userId });
    try {
      await this.ready;
      this.assertSession();
      let pushed = false;
      const once = () =>
        synchronize({
          database: this.database,
          migrationsEnabledAtVersion: 4,
          sendCreatedAsUpdated: true,
          pullChanges: async args => {
            this.assertSession();
            const result = await this.api.pull(args);
            this.assertSession();
            if (!args.lastPulledAt)
              await reconcileLegacyFirstPull(
                this.database,
                result.changes,
                this.userId,
              );
            console.info('sync.pull', {
              userId: this.userId,
              lastPulledAt: args.lastPulledAt ?? null,
              counts: changeCounts(result.changes),
            });
            // Treat incoming records as upserts. Unlike a remote `created`, Watermelon's
            // `updated` path preserves a local tombstone until its deletion is pushed.
            for (const table of SYNC_TABLES) {
              result.changes[table].updated = [
                ...result.changes[table].created,
                ...result.changes[table].updated,
              ];
              result.changes[table].created = [];
            }
            return result;
          },
          pushChanges: async args => {
            this.assertSession();
            console.info('sync.push', {
              userId: this.userId,
              lastPulledAt: args.lastPulledAt,
              counts: changeCounts(args.changes),
            });
            await this.api.push(args);
            // If logout occurred, do not acknowledge local changes. A later retry is idempotent.
            this.assertSession();
            pushed = true;
          },
          conflictResolver: (_table, _local, remote, resolved) => ({
            ...resolved,
            created_at: remote.created_at,
            updated_at: remote.updated_at,
            user_id: this.userId,
            sync_status: 'SYNCED',
            sync_version: 0,
            deleted_at: null,
          }),
        });
      try {
        await once();
      } catch (error) {
        if (errorStatus(error) !== 409) throw error;
        console.info('sync.conflict', { userId: this.userId });
        await once(); // fresh pull + Watermelon per-column reconciliation, one bounded retry
      }
      // Receive canonical server values/cascades once after a successful push.
      if (pushed) await once();
      this.assertSession();
      this.failures = 0;
      this.lastSuccess = Date.now();
      await this.database.adapter.setLocal(
        'sync_display_last_success',
        new Date(this.lastSuccess).toISOString(),
      );
      state.setLastSyncAt(new Date(this.lastSuccess).toISOString()); // UI time, never a checkpoint
      state.setStatus('idle');
      const pending = await this.hydrateSyncState();
      if (pending) this.schedule();
      console.info('sync.finish', {
        userId: this.userId,
        durationMs: Date.now() - started,
        pending,
      });
    } catch (error) {
      if (!this.ownsSession()) throw error;
      const status = errorStatus(error);
      const transient =
        status === undefined ||
        status === 408 ||
        status === 429 ||
        status >= 500;
      state.setStatus(this.online() ? 'error' : 'offline');
      state.setError(
        error instanceof SyncValidationError
          ? error.message
          : status === 409
            ? 'Conflicto pendiente. Vuelve a sincronizar; tus cambios siguen guardados.'
            : status === 400 || status === 403 || status === 413
              ? 'El servidor no acepta algunos cambios o el tamaño del lote. Se conservan localmente; revisa los datos.'
              : 'No se pudo sincronizar. Tus cambios siguen guardados en este dispositivo.',
      );
      console.warn('sync.error', {
        userId: this.userId,
        status,
        durationMs: Date.now() - started,
      });
      await this.hydrateSyncState().catch(() => {});
      this.failures += 1;
      if (transient && this.failures <= 5)
        this.schedule(
          Math.min(300000, 5000 * 2 ** (this.failures - 1)) +
            Math.floor(Math.random() * 1000),
        );
      throw error;
    }
  }
}
