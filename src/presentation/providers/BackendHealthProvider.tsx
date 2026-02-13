import { useEffect } from 'react';
import systemApi from '@/features/system/services/SystemApi';
import { useNetworkStore } from '@/store/useNetworkStore';

const CHECK_INTERVAL_MS = 180_000;

const BackendHealthProvider = () => {
  const isOnline = useNetworkStore(state => state.isOnline);
  const isInitialized = useNetworkStore(state => state.isInitialized);

  useEffect(() => {
    if (isInitialized && !isOnline) return;

    const runChecks = async () => {
      try {
        await Promise.all([
          systemApi.getHealth(),
          systemApi.getReady(),
          systemApi.getLive(),
        ]);
      } catch {
        // Non-blocking backend telemetry checks.
      }
    };

    runChecks();
    const interval = setInterval(runChecks, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isInitialized, isOnline]);

  return null;
};

export default BackendHealthProvider;

