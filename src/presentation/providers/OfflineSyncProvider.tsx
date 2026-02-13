import { useEffect } from 'react';
import { AppState } from 'react-native';
import { getFeatureContainer } from '@/features/getFeatureContainer';
import { useAuthStore } from '@/store/useAuthStore';
import { useNetworkStore } from '@/store/useNetworkStore';
import { useSyncStore } from '@/store/useSyncStore';

const SYNC_INTERVAL_MS = 45_000;

const OfflineSyncProvider = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);
  const isOnline = useNetworkStore(state => state.isOnline);
  const isInitialized = useNetworkStore(state => state.isInitialized);

  useEffect(() => {
    const featureContainer = getFeatureContainer();
    if (!featureContainer?.sync) return;
    featureContainer.sync.hydrateSyncState();
  }, []);

  useEffect(() => {
    const featureContainer = getFeatureContainer();
    if (!featureContainer?.sync || !isAuthenticated || !user?.id) return;
    if (isInitialized && !isOnline) {
      useSyncStore.getState().setStatus('offline');
      return;
    }

    featureContainer.sync.syncNow(user.id);

    const interval = setInterval(() => {
      featureContainer.sync.syncNow(user.id);
    }, SYNC_INTERVAL_MS);

    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        featureContainer.sync.syncNow(user.id);
      }
    });

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [isAuthenticated, isInitialized, isOnline, user?.id]);

  return null;
};

export default OfflineSyncProvider;
