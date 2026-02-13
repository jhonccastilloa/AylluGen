import type { NetInfoStateType } from '@react-native-community/netinfo';
import { create } from 'zustand';

interface NetworkSnapshot {
  isOnline: boolean;
  connectionType: NetInfoStateType | 'unknown';
}

interface NetworkState extends NetworkSnapshot {
  isInitialized: boolean;
  lastCheckedAt?: number;
  setSnapshot: (snapshot: NetworkSnapshot) => void;
  markOffline: () => void;
  markOnline: () => void;
  reset: () => void;
}

const INITIAL_STATE: Omit<
  NetworkState,
  'setSnapshot' | 'markOffline' | 'markOnline' | 'reset'
> = {
  isInitialized: false,
  isOnline: true,
  connectionType: 'unknown',
  lastCheckedAt: undefined,
};

export const useNetworkStore = create<NetworkState>()(set => ({
  ...INITIAL_STATE,
  setSnapshot: snapshot =>
    set({
      ...snapshot,
      isInitialized: true,
      lastCheckedAt: Date.now(),
    }),
  markOffline: () =>
    set({
      isInitialized: true,
      isOnline: false,
      lastCheckedAt: Date.now(),
    }),
  markOnline: () =>
    set({
      isInitialized: true,
      isOnline: true,
      lastCheckedAt: Date.now(),
    }),
  reset: () => set(INITIAL_STATE),
}));

