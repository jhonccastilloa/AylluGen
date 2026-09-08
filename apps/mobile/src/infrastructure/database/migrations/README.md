# Migraciones locales

Revisado: 2026-09-05. Esquema actual 4; siete tablas. Esta guía describe migraciones existentes, no autoriza reset ni purga.

La versión 2 es el primer esquema disponible en el historial del repositorio.
La migración 2 → 3 inicia el historial de migraciones sin ejecutar cambios SQL:
conserva las seis tablas, columnas, índices y registros, incluida la cola pendiente.
La migración 3 → 4 agrega la tabla `species` y la columna nullable/indexada
`animals.species_id`. Las instalaciones nuevas crean directamente el esquema 4,
con siete tablas. `sync_queue` se conserva para leer pendientes antiguos durante
la importación; su repositorio/compactador de ejecución ya no forman parte de la app.

No existe una migración 1 → 2 reconstruida. Si hay dispositivos con versión 1,
se debe recuperar su esquema original y agregar ese paso antes de distribuir
esta actualización. `PreservingSQLiteAdapter` rechaza versiones antiguas sin ruta
de migración para evitar el reset de WatermelonDB y conservar sus datos.
Esta protección no cubre downgrades: no instalar una app con esquema inferior.

La importación conserva el archivo `ayllugen_offline` y copia solo los registros
del propietario a `ayllugen_sync_<userUUID>`, con marcador atómico en `app_meta`.
No eliminar la cola, los campos históricos ni el archivo antiguo como parte de
una limpieza de código. Más detalles en `../../../../docs/LOCAL_FIRST_MOBILE.md`.

Para futuros cambios estructurales:

1. Agregar una migración con `toVersion` consecutivo y pasos explícitos.
2. Actualizar las definiciones correspondientes en `../schema/`.
3. Incrementar la versión de `appSchema` para que coincida con la última migración.
4. Verificar la actualización desde versiones soportadas y una instalación nueva,
   incluyendo conservación de registros y operaciones pendientes de sincronización.

Las migraciones publicadas deben conservar sus definiciones históricas. No importar
los esquemas actuales de las tablas para construir pasos antiguos: esos esquemas
seguirán cambiando. Nuevos refactors que solo muevan archivos no necesitan otra versión.
