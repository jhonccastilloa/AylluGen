import { useEffect, type ReactNode } from 'react';
import { AppState } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useNetworkStore } from '@/store/useNetworkStore';

interface NetworkStatusProviderProps {
  children: ReactNode;
}

const toIsOnline = (state: NetInfoState): boolean =>
  Boolean(state.isConnected && (state.isInternetReachable ?? true));

const NetworkStatusProvider = ({ children }: NetworkStatusProviderProps) => {
  useEffect(() => {
    const applyState = (state: NetInfoState) => {
      useNetworkStore.getState().setSnapshot({
        isOnline: toIsOnline(state),
        connectionType: state.type,
      });
    };

    NetInfo.fetch()
      .then(applyState)
      .catch(() => {
        useNetworkStore.getState().markOffline();
      });

    const unsubscribeNetInfo = NetInfo.addEventListener(applyState);

    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state !== 'active') return;

      NetInfo.fetch()
        .then(applyState)
        .catch(() => {
          useNetworkStore.getState().markOffline();
        });
    });

    return () => {
      unsubscribeNetInfo();
      appStateSubscription.remove();
    };
  }, []);

  return <>{children}</>;
};

export default NetworkStatusProvider;

