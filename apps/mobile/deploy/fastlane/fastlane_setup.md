# Fastlane: configuración existente y bloqueos

Revisado: 2026-09-05. **No considerar este pipeline validado para publicar AylluGen.** Esta revisión solo documenta el código; no ejecuta lanes ni cambia credenciales.

## Ubicación y dependencias

El Gemfile de Fastlane está en [../Gemfile](../Gemfile), no en Android. El Gemfile de la raíz móvil corresponde a CocoaPods. Desde `AylluGen-App/deploy`, `bundle install` prepara las dependencias de automatización.

[Fastfile](Fastfile) define únicamente `android beta` e `ios beta`; no existen lanes `android deploy` ni `android test`. [README.md](README.md) es el índice autogenerado de lanes; regenerarlo no acredita que funcionen.

## Efectos de las lanes

Android consulta Firebase si faltan versión/build, cambia versiones Gradle, compila release, distribuye a testers y hace **commit y push**. Usa `FIREBASE_APP_ID` y `FIREBASE_TOKEN`.

iOS consulta TestFlight, modifica versiones, compila/sube a TestFlight, hace commit/push y notifica Teams usando `TEAMS_WEBHOOK_URL`. Requiere macOS, firma y configuración de App Store Connect.

No ejecutar estas lanes como simple comprobación de build. Mantener secretos fuera de Git y requerir autorización de distribución.

## Referencias heredadas detectadas

- Proyectos/workspace `DigitalBank` y scheme/configuración `Desarrollo` no corresponden a los nombres de AylluGen.
- `app/core/Constants.ts` es una ruta heredada. La API móvil está realmente en `src/core/config/env.ts`; Fastlane no implementa actualmente una selección funcional de esa URL.
- Las rutas relativas se resuelven contra `Dir.pwd`: verificar explícitamente la raíz antes de ejecutar.
- La salida Android esperada es production/release, pero la llamada Gradle usa assemble Release genérico: comprobar flavor y artefacto.
- La firma release falló en la última comprobación por falta del keystore autorizado.

## Camino comprobado para desarrollo

Usar el build debug descrito en [README_SETUP.md](../../README_SETUP.md), sin publicar ni hacer commits automáticos.

Antes de habilitar Fastlane: corregir rutas/schemes/flavors en una tarea de implementación separada, verificar firma y destino, desplegar Sync v2, configurar staging y probar actualización conservando datos offline. No generar una clave sustitutiva para actualizar una app ya distribuida.
