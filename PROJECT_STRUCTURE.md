# Estructura Base del Proyecto AylluGen

## Tecnologías Implementadas

### Core

- **React Native 0.83.1** - Framework principal
- **TypeScript 5.8.3** - Tipado estático
- **Zustand 5** - Estado global

### Estilos

- **react-native-unistyles** - Sistema de estilos con:
  - Themes light/dark
  - Dark mode automático
  - Breakpoints responsivos (sm: 375px, md: 768px, lg: 1024px)
  - StyleSheet reactivo
  - Tipado completo para colores y spacing

### Almacenamiento

- **react-native-mmkv** - Almacenamiento de alto rendimiento:
  - Sincronización nativa
  - Persistencia de datos
  - Rápido y eficiente

### HTTP

- **Axios** - Cliente HTTP con:
  - Interceptors para request/response
  - Token authentication automático
  - Loader management
  - Error handling centralizado

### UI

- **react-native-safe-area-context** - Safe area handling
- **react-native-toast-notifications** - Toast notifications
- **react-native-reanimated** - Animaciones fluidas

## Estructura de Archivos

### Configuración Centralizada

```
src/core/config/
└── env.ts          # Variables de entorno (API URL, timeouts, etc)
```

### Constantes Globales

```
src/core/constants/
└── theme.ts        # Colores, spacing, tipografía, breakpoints
```

### Sistema de Logging

```
src/infrastructure/logger/
└── index.ts        # Logger con timestamps y niveles de log
```

### Storage Adapter

```
src/core/storage/
└── StorageAdapter.ts  # Wrapper para MMKV con acceso síncrono
```

### Configuración de Temas

```
src/infrastructure/theme/
├── index.ts        # Configuración de Unistyles
└── themes.ts       # Themes light/dark completos
```

### Cliente API

```
src/infrastructure/api/
├── apiClient.ts    # Axios instance con interceptors
└── ApiService.ts   # Métodos CRUD tipados
```

### Estado Global

```
src/store/
├── useLoaderStore.ts   # Loader state
├── useThemeStore.ts    # Theme preferences
└── useAuthStore.ts     # Authentication state
```

### Componentes UI

```
src/presentation/components/
├── ExampleComponent.tsx        # Demo de estilos
├── ThemeToggle.tsx            # Theme switcher
├── Loader.tsx                 # Loading indicator
├── ExampleResponsiveComponent.tsx  # Layout responsivo
└── ResponsiveExample.tsx       # Ejemplo avanzado
```

## Características Implementadas

### 1. Theme System

- ✅ Themes light y dark completos
- ✅ Dark mode automático del sistema
- ✅ Switch manual de temas
- ✅ Persistencia de preferencias

### 2. Design System

- ✅ Paleta de colores consistente
- ✅ Sistema de spacing (xs, sm, md, lg, xl, xxl, xxxl)
- ✅ Border radius predefinidos
- ✅ Tipografía escalable
- ✅ Shadows predefinidos

### 3. API Layer

- ✅ Cliente Axios configurado
- ✅ Interceptors automáticos
- ✅ Token injection
- ✅ Error handling
- ✅ Request/response logging

### 4. State Management

- ✅ Zustand stores
- ✅ Persistencia con MMKV
- ✅ Auth state
- ✅ Loader state
- ✅ Theme state

### 5. Componentes de Ejemplo

- ✅ ExampleComponent - Demo de colores y estilos
- ✅ ThemeToggle - Cambio de temas
- ✅ Loader - Indicador de carga
- ✅ ResponsiveExample - Layout adaptativo

## Cómo Usar

### Crear un nuevo componente

```typescript
import { StyleSheet } from '@/infrastructure/theme';
import { View, Text } from 'react-native';

export const MyComponent = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello</Text>
    </View>
  );
};

const styles = StyleSheet.create((theme: any) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  text: {
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.md,
  },
}));
```

### Usar el API

```typescript
import { ApiService } from '@/infrastructure/api/ApiService';

const fetchData = async () => {
  const data = await ApiService.get<DataType>('/endpoint');
  return data;
};

const postData = async (payload: any) => {
  const data = await ApiService.post<ResponseType>('/endpoint', payload);
  return data;
};
```

### Usar el store

```typescript
import { useAuthStore } from '@/store/useAuthStore';

const MyScreen = () => {
  const { user, login, logout } = useAuthStore();

  const handleLogin = async () => {
    await login(email, password);
  };

  return <View>{/* ... */}</View>;
};
```

### Usar el storage

```typescript
import StorageAdapter from '@/core/storage/StorageAdapter';

const saveData = () => {
  StorageAdapter.setItem('key', JSON.stringify({ data: 'value' }));
}

const loadData = () => {
  const raw = StorageAdapter.getItem('key');
  return raw ? JSON.parse(raw) : null;
}
```

## Próximos Pasos

1. **Configurar navegación** - React Navigation
2. **Implementar React Query** - Cache de API
3. **Agregar validación** - Zod para schemas
4. **Implementar testing** - Unit y E2E tests
5. **Configurar CI/CD** - Pipeline automatizado
6. **Agregar analytics** - Monitoreo de uso

## Notas Importantes

- MMKV requiere linking nativo en iOS (pod install) y Android
- Unistyles configura los temas automáticamente al importar
- El loader se muestra automáticamente en todas las requests API
- El theme persiste en MMKV
- Los tokens se inyectan automáticamente en las requests

Para más información, consulta `ARCHITECTURE.md`.
