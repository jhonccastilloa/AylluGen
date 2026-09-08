import { useEffect, useRef } from 'react';
import { getAccountContainer } from '@/features/container';
import { useAuthStore } from '@/store/useAuthStore';
import { SYNC_TABLES } from '@/features/sync/services/watermelonProtocol';

/** Re-query projections after committed local writes or remote pulls, without network reads. */
export function useLocalRefresh(refresh: () => Promise<unknown>) {
  const userId = useAuthStore(s => s.user?.id);
  const callback = useRef(refresh);
  callback.current = refresh;
  useEffect(() => {
    if (!userId) return;
    let disposed = false;
    let running = false;
    let requested = false;
    const run = async () => {
      requested = true;
      if (running) return;
      running = true;
      try {
        while (requested && !disposed) {
          requested = false;
          await callback.current();
        }
      } catch {
        // Existing screen loaders display their own errors; never log record contents.
      } finally {
        running = false;
      }
    };
    const subscription = getAccountContainer()
      .database.withChangesForTables([...SYNC_TABLES])
      .subscribe(() => {
        void run();
      });
    return () => {
      disposed = true;
      subscription.unsubscribe();
    };
  }, [userId]);
}
