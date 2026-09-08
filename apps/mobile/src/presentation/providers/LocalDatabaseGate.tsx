import { useEffect, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, Button, Text, View } from 'react-native';
import { getAccountContainer } from '@/features/container';
import { useAuthStore } from '@/store/useAuthStore';
import { useSyncStore } from '@/store/useSyncStore';

export default function LocalDatabaseGate({ children }: PropsWithChildren) {
  const userId = useAuthStore(s =>
    s.isAuthenticated ? s.user?.id : undefined,
  );
  const [readyUser, setReadyUser] = useState<string>();
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setError(false);
    useSyncStore.getState().reset();
    if (userId) {
      try {
        getAccountContainer()
          .ready.then(() => {
            if (!cancelled) setReadyUser(userId);
          })
          .catch(() => {
            if (!cancelled) setError(true);
          });
      } catch {
        setError(true);
      }
    }
    return () => {
      cancelled = true;
    };
  }, [userId]);
  if (userId && readyUser !== userId)
    return (
      <View>
        {error ? (
          <>
            <Text>
              No se pudo preparar la base local. Los datos antiguos se
              conservan. Reinicia la app o solicita soporte; no borres sus
              datos.
            </Text>
            <Button
              title="Cerrar sesión"
              onPress={() => {
                void useAuthStore.getState().logout();
              }}
            />
          </>
        ) : (
          <>
            <ActivityIndicator />
            <Text>Preparando tus datos locales…</Text>
          </>
        )}
      </View>
    );
  return (
    <View key={userId ?? 'signed-out'} style={{ flex: 1 }}>
      {children}
    </View>
  );
}
