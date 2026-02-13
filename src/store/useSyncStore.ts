import { create } from 'zustand';

type SyncStateStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface SyncState {
  status: SyncStateStatus;
  pendingChanges: number;
  lastSyncAt?: string;
  error?: string;
  setStatus: (status: SyncStateStatus) => void;
  setPendingChanges: (count: number) => void;
  setLastSyncAt: (lastSyncAt?: string) => void;
  setError: (error?: string) => void;
  reset: () => void;
}

export const useSyncStore = create<SyncState>()(set => ({
  status: 'idle',
  pendingChanges: 0,
  lastSyncAt: undefined,
  error: undefined,
  setStatus: status => set({ status }),
  setPendingChanges: pendingChanges => set({ pendingChanges }),
  setLastSyncAt: lastSyncAt => set({ lastSyncAt }),
  setError: error => set({ error }),
  reset: () =>
    set({
      status: 'idle',
      pendingChanges: 0,
      lastSyncAt: undefined,
      error: undefined,
    }),
}));
