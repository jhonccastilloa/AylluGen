import { useEffect } from 'react';
import { AppState } from 'react-native';
import { getAccountContainer } from '@/features/container';
import { useAuthStore } from '@/store/useAuthStore';
import { useNetworkStore } from '@/store/useNetworkStore';
import { useSyncStore } from '@/store/useSyncStore';

const OfflineSyncProvider = () => {
  const userId = useAuthStore(state =>
    state.isAuthenticated ? state.user?.id : undefined,
  );
  const isOnline = useNetworkStore(state => state.isOnline);
  const isInitialized = useNetworkStore(state => state.isInitialized);
  useEffect(() => {
    if (!userId) return;
    const { sync } = getAccountContainer();
    const update = (appState: string) => {
      if (appState === 'background' || appState === 'inactive') {
        sync.stop();
      } else {
        sync.start(); // keep observing/counting local writes while offline
        if (isInitialized && !isOnline)
          useSyncStore.getState().setStatus('offline');
      }
    };
    update(AppState.currentState);
    const subscription = AppState.addEventListener('change', update);
    return () => {
      subscription.remove();
      sync.stop();
    };
  }, [userId, isOnline, isInitialized]);
  return null;
};
export default OfflineSyncProvider;
