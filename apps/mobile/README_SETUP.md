# Preparación del entorno móvil

Revisado: 2026-09-05. Los comandos se ejecutan desde la raíz de AylluGen-App salvo indicación.

## Dependencias y configuración

- Node.js >=20 según [package.json](package.json); instalar con `npm ci`.
- Android: JDK 17, Android SDK y herramientas definidos en [build.gradle](android/build.gradle) (compile SDK/build tools 36).
- iOS: macOS, Xcode y CocoaPods mediante el [Gemfile](Gemfile). No se puede compilar iOS desde Windows.
- [env.ts](src/core/config/env.ts) configura API/timeout. No existe un selector de staging operativo: `__DEV__` cambia el nombre del entorno, pero ambas ramas usan la misma URL.
- [babel.config.js](babel.config.js) y [tsconfig.json](tsconfig.json) resuelven `@/*` a `src/*`. No introducir React Query como segunda fuente de las entidades sincronizadas.

## Android

```sh
npm ci
npm start
```

En otra terminal:

```sh
npx react-native run-android --mode=developmentDebug --appId=com.ayllugen.dev
```

Compilar sin instalar, en PowerShell:

```powershell
cd android
.\gradlew.bat :app:assembleDevelopmentDebug --console=plain
```

APK: `android/app/build/outputs/apk/development/debug/app-development-debug.apk`.

Hay flavors `development` y `production`. `npm run android` solicita `developmentRelease`; requiere firma release. La última compilación release falló por ausencia de `android/app/my-ayllugen-key.keystore`. Recuperar la clave autorizada; no sustituirla por una nueva para actualizar instalaciones existentes.

## iOS

```sh
bundle install
cd ios
bundle exec pod install
cd ..
npm run ios
```

[Podfile](ios/Podfile) referencia simdjson, dependencia transitiva ya instalada. Watermelon solicita JSI en iOS; Android usa el bridge SQLite asíncrono autolinkeado. Compilación y ejecución iOS todavía no verificadas.

## Calidad

```sh
npm test -- --runInBand
npx tsc --noEmit
npm run lint
```

Resultados y limitaciones vigentes en [LOCAL_FIRST_MOBILE.md](docs/LOCAL_FIRST_MOBILE.md). Los tests de sync usan el motor real con Loki en memoria y HTTP simulado; no prueban SQLite nativo end-to-end.

## Primera ejecución y actualización

El login/registro inicial necesita red. Después se abre una base aislada por cuenta y se activa sync, sin importación histórica. No copiar checkpoints de otra cuenta ni usar timestamps antiguos como checkpoint v2.

Esta entrega requiere borrar una sola vez el almacenamiento local de la app de desarrollo o reinstalarla sin restaurar sus datos, incluidas instalaciones anteriores con schema 6. Esa limpieza descarta sesiones, preferencias y pendientes locales. No hay migración desde instalaciones anteriores ni borrado automático al arrancar. Desplegar primero backend con todas las migraciones SQL aplicadas y luego móvil; probar modo avión, reinicio y conflictos con cuentas de prueba.

[Fastlane](deploy/fastlane/fastlane_setup.md) contiene automatizaciones heredadas con efectos externos; no es el camino validado para esta comprobación.
