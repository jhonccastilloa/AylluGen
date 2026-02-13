import React, { useEffect } from 'react';
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import Loader from '@/presentation/components/Loader';
import { Platform } from 'react-native';
import I18nProvider from './presentation/providers/I18nProvider';
import Toast from 'react-native-toast-message';
import toastConfig from './shared/utils/toastConfig';
import MainNavigator from './presentation/navigation/MainNavigator';
import OfflineSyncProvider from './presentation/providers/OfflineSyncProvider';
import ThemeProvider from './presentation/providers/ThemeProvider';
import NetworkStatusProvider from './presentation/providers/NetworkStatusProvider';
import BackendHealthProvider from './presentation/providers/BackendHealthProvider';

function App(): React.JSX.Element {
  const isAndroid15 = Platform.OS === 'android' && Platform.Version >= 35;

  return (
    <SafeAreaProvider
      style={
        isAndroid15
          ? {
              marginBottom: initialWindowMetrics?.insets.bottom,
              marginTop: initialWindowMetrics?.insets.top,
            }
          : {}
      }
    >
      <I18nProvider>
        <ThemeProvider>
          <NetworkStatusProvider>
            <BackendHealthProvider />
            <OfflineSyncProvider />
            <Loader />
            <MainNavigator />
            <Toast position="bottom" config={toastConfig} />
          </NetworkStatusProvider>
        </ThemeProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}

export default App;
