# AylluGen — aplicación móvil

Estado del código revisado: 2026-09-05. React Native 0.83.1, React 19.2, TypeScript, WatermelonDB 0.28/SQLite, Zustand, MMKV, Axios, Zod y React Navigation. Las versiones exactas instalables están en [package-lock.json](package-lock.json).

## Flujo de datos

La UI lee y modifica especies, animales, cruces, salud y producción en WatermelonDB. `SyncOrchestrator` ejecuta `synchronize()` contra `POST /api/sync/v2/pull` y `POST /api/sync/v2/push`. No hay CRUD remoto alternativo según conectividad ni cola de ejecución paralela.

Autenticación, perfil/contraseña y cálculo de consanguinidad siguen siendo REST. El cálculo requiere genealogía sincronizada; guardar el cruce es local.

## Desarrollo

Desde esta carpeta:

```sh
npm ci
npm start
```

En otra terminal, para Android debug:

```sh
npx react-native run-android --mode=developmentDebug --appId=com.ayllugen.dev
```

El script `npm run android` utiliza **developmentRelease**, no debug: necesita la clave de firma. Preparación Android/iOS en [README_SETUP.md](README_SETUP.md).

## Documentación

- [Arquitectura](ARCHITECTURE.md): responsabilidades y flujo actual.
- [Estructura](PROJECT_STRUCTURE.md): ubicación del código.
- [Resumen offline](OFFLINE_ARCHITECTURE.md).
- [Integración Local-First](docs/LOCAL_FIRST_MOBILE.md): contrato, migración, conflictos, límites y verificación.
- [Migraciones SQLite](src/infrastructure/database/migrations/README.md).
- [Estado de Fastlane](deploy/fastlane/fastlane_setup.md).
- [Backend](../AylluGen-bk/README.md) y [contrato de integración](../AylluGen-bk/.claude/docs/ai/watermelon-sync/api-handoff.md).
- [Reglas de contribución](AGENTS.md).

## Verificación y pendientes

Última comprobación tras retirar código muerto: **59 tests / 11 suites pasan**, TypeScript pasa. Lint general: 14 errores preexistentes en i18n, login y ajustes; no está completamente limpio.

Android debug compiló antes de la limpieza de código muerto. Release falló por falta del keystore; iOS y pruebas E2E con dispositivos siguen pendientes. No se desplegó producción.

Debug y release apuntan actualmente al mismo servidor remoto en [env.ts](src/core/config/env.ts). Configurar staging antes de pruebas que escriban datos. Desplegar backend v2 y migraciones antes de distribuir esta app.

No desinstalar ni limpiar datos para corregir un error de sync: se deben preservar pendientes y bases por cuenta.
