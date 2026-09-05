# Migraciones locales

La versión 2 es el primer esquema disponible en el historial del repositorio.
La migración 2 → 3 inicia el historial de migraciones sin ejecutar cambios SQL:
conserva las seis tablas, columnas, índices y registros, incluida la cola pendiente.
Las instalaciones nuevas crean directamente el esquema de la versión 3.

No existe una migración 1 → 2 reconstruida. Si hay dispositivos con versión 1,
se debe recuperar su esquema original y agregar ese paso antes de distribuir
esta actualización. WatermelonDB reinicia la base si falta una ruta de migración;
conectar las migraciones no protege versiones anteriores al rango cubierto.

Para futuros cambios estructurales:

1. Agregar una migración con `toVersion` consecutivo y pasos explícitos.
2. Actualizar las definiciones correspondientes en `../schema/`.
3. Incrementar la versión de `appSchema` para que coincida con la última migración.
4. Verificar la actualización desde versiones soportadas y una instalación nueva,
   incluyendo conservación de registros y operaciones pendientes de sincronización.

Las migraciones publicadas deben conservar sus definiciones históricas. No importar
los esquemas actuales de las tablas para construir pasos antiguos: esos esquemas
seguirán cambiando. Nuevos refactors que solo muevan archivos no necesitan otra versión.
