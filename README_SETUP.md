# Proyecto Base React Native - AylluGen

## ✅ Estructura Completa Implementada

### Configuración Base

- ✅ TypeScript 5.8.3 con configuración estricta
- ✅ Babel con alias `@/*` para imports
- ✅ ESLint y Prettier configurados
- ✅ Paths configurados en tsconfig.json

### Tecnologías Instaladas

#### Core

- **react**: 19.2.0
- **react-native**: 0.83.1
- **typescript**: 5.8.3

#### Estado Global

- **zustand**: 5.x
- **react-native-mmkv**: Persistencia eficiente

#### Estilos

- **react-native-unistyles**: Sistema de estilos avanzado
  - Themes light/dark
  - Dark mode automático
  - Breakpoints responsivos (sm: 375px, md: 768px, lg: 1024px)

#### HTTP

- **axios**: Cliente HTTP
  - Interceptors automáticos
  - Token injection
  - Error handling

#### UI

- **react-native-safe-area-context**
- **react-native-toast-notifications**
- **react-native-reanimated**

## 📁 Estructura de Carpetas

```
src/
├── core/
│   ├── config/
│   │   └── env.ts                    # Variables de entorno
│   ├── constants/
│   │   └── theme.ts                  # Design tokens (colors, spacing, etc)
│   ├── types/
│   │   ├── api.ts                    # Tipos para API
│   │   └── unistyles.d.ts            # Declarations de tipos
│   └── utils/
│       └── apiErrorHandler.ts        # Manejo de errores
│
├── domain/
│   ├── entities/                     # Entidades del dominio
│   └── repositories/
│       └── AuthRepository.ts         # Repositorio de autenticación
│
├── infrastructure/
│   ├── api/
│   │   ├── apiClient.ts             # Axios con interceptors
│   │   └── ApiService.ts           # Métodos CRUD
│   ├── logger/
│   │   └── index.ts                # Sistema de logging
│   ├── storage/
│   │   └── StorageAdapter.ts       # Wrapper MMKV
│   └── theme/
│       ├── index.ts                 # Configuración Unistyles
│       └── themes.ts                # Themes light/dark
│
├── presentation/
│   ├── components/
│   │   ├── ExampleComponent.tsx     # Demo de estilos
│   │   ├── ExampleResponsiveComponent.tsx
│   │   ├── ResponsiveExample.tsx
│   │   ├── ThemeToggle.tsx         # Theme switcher
│   │   └── Loader.tsx              # Loading indicator
│   ├── screens/                     # Pantallas de la app
│   ├── hooks/                       # Custom hooks
│   └── navigation/                  # Configuración navegación
│
└── store/
    ├── useLoaderStore.ts            # Estado del loader
    ├── useThemeStore.ts             # Preferencias de tema
    ├── useAuthStore.ts              # Estado de autenticación
    └── useAppStore.ts               # Estado general de la app
```

## 🎨 Design System Implementado

### Colores

```typescript
colors: {
  primary, primaryLight, primaryDark,
  secondary, secondaryLight, secondaryDark,
  success, successLight, successDark,
  warning, warningLight, warningDark,
  error, errorLight, errorDark,
  info, infoLight, infoDark,
  background, surface, text, textSecondary, ...
}
```

### Spacing

```typescript
spacing: {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64
}
```

### Tipografía

```typescript
typography: {
  fontSize: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, xxl: 24, xxxl: 32 },
  fontWeight: { regular: '400', medium: '500', semibold: '600', bold: '700' }
}
```

### Breakpoints

```typescript
breakpoints: { sm: 375, md: 768, lg: 1024, xl: 1280 }
```

## 🔧 Cómo Usar

### Crear un componente con estilos

```typescript
import { StyleSheet, useUnistyles } from '@/infrastructure/theme';
import { View, Text } from 'react-native';

export const MyComponent = () => {
  const { theme } = useUnistyles();

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

### Hacer peticiones API

```typescript
import { ApiService } from '@/infrastructure/api/ApiService';

// GET
const data = await ApiService.get<UserType>('/users/1');

// POST
const result = await ApiService.post<ResponseType>('/login', credentials);

// PUT
const updated = await ApiService.put<UserType>('/users/1', updates);

// DELETE
await ApiService.delete('/users/1');
```

### Usar el store de Zustand

```typescript
import { useAuthStore } from '@/store/useAuthStore';

const MyScreen = () => {
  const { user, login, logout, isLoading } = useAuthStore();

  const handleLogin = async () => {
    try {
      await login('email@example.com', 'password');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View>
      {isLoading && <Text>Loading...</Text>}
      {user && <Text>Welcome {user.name}</Text>}
    </View>
  );
};
```

### Persistir datos con MMKV

```typescript
import StorageAdapter from '@/core/storage/StorageAdapter';

// Guardar
StorageAdapter.setItem('user', JSON.stringify({ name: 'John' }));

// Obtener
const userRaw = StorageAdapter.getItem('user');
const user = userRaw ? JSON.parse(userRaw) : null;

// Eliminar
StorageAdapter.removeItem('user');
```

## ⚙️ Configuración

### Variables de Entorno

Edita `src/core/config/env.ts`:

```typescript
const config = {
  env: getEnv(),
  apiBaseUrl: 'https://api.example.com/api',
  apiTimeout: 30000,
  enableLogging: __DEV__,
};
```

### Configuración de Babel

Los alias `@/*` están configurados en `babel.config.js`

### Configuración de TypeScript

Los paths están configurados en `tsconfig.json`

## 📝 Notas Importantes

### MMKV (Storage)

- Requiere linking nativo:
  - **iOS**: `cd ios && pod install`
  - **Android**: Configuración automática en build.gradle

### Unistyles

- Los temas se configuran automáticamente al importar
- Usa `StyleSheet` de `react-native-unistyles` en lugar de `StyleSheet` de React Native
- El dark mode usa el tema del sistema automáticamente

### Axios Interceptors

- Token se inyecta automáticamente desde el store de auth
- Loader se muestra automáticamente en todas las requests
- Los errores se manejan centralmente

## 🚀 Próximos Pasos Recomendados

1. **Configurar navegación**

   ```bash
   npm install @react-navigation/native @react-navigation/native-stack
   ```

2. **Implementar React Query**

   ```bash
   npm install @tanstack/react-query
   ```

3. **Agregar validación con Zod**

   ```bash
   npm install zod
   ```

4. **Configurar tests**

   ```bash
   npm install --save-dev @testing-library/react-native jest
   ```

5. **Configurar monitoreo (Sentry)**
   ```bash
   npm install @sentry/react-native
   ```

## 📚 Documentación Adicional

- **Arquitectura completa**: `ARCHITECTURE.md`
- **Estructura del proyecto**: `PROJECT_STRUCTURE.md`

## 🐛 Problemas Conocidos

### TypeScript Errors con MMKV

El paquete `react-native-mmkv` puede mostrar errores de TypeScript si no está correctamente instalado. Asegúrate de:

1. Ejecutar `cd ios && pod install`
2. Reinstalar si es necesario: `npm uninstall react-native-mmkv && npm install react-native-mmkv`

### Unistyles Type Errors

Si hay errores de tipos con Unistyles, verifica que:

1. La configuración se importa antes de usar componentes
2. Los temas están correctamente tipados
3. El archivo `unistyles.d.ts` existe

## ✨ Características Clave

### ✅ Implementado

- ✅ Sistema de temas completo (light/dark)
- ✅ Dark mode automático
- ✅ API client con interceptors
- ✅ Estado global con Zustand
- ✅ Almacenamiento eficiente con MMKV
- ✅ Sistema de logging
- ✅ Manejo centralizado de errores
- ✅ Design system completo
- ✅ Componentes de ejemplo
- ✅ Tipado TypeScript estricto

### 📋 Por Implementar

- ⏳ Navegación con React Navigation
- ⏳ Cache de API con React Query
- ⏳ Validación de datos con Zod
- ⏳ Testing framework
- ⏳ CI/CD pipeline
- ⏳ Monitoreo con Sentry
- ⏳ Documentación de componentes (Storybook)

## 🎯 Conclusiones

Esta estructura base proporciona un punto de partida sólido para un sistema de media escala en React Native, siguiendo los principios de Clean Architecture y buenas prácticas de desarrollo.

Para un análisis detallado de la arquitectura, problemas identificados y mejoras recomendadas, consulta `ARCHITECTURE.md`.
