import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import type { ResultCallback } from '@nozbe/watermelondb/utils/fp/Result';

/** Watermelon 0.28 resets an incompatible DB when no migration path exists.
 * Fail closed: a development reset must be explicit, never erase data on startup.
 * This narrow internal override must be rechecked when upgrading WatermelonDB.
 */
export class PreservingSQLiteAdapter extends SQLiteAdapter {
  _setUpWithMigrations(version: number, callback: ResultCallback<void>): void {
    if (!this._migrationSteps(version)) {
      callback({
        error: new Error(
          'Base local incompatible. Esta versión de desarrollo requiere una instalación limpia.',
        ),
      });
      return;
    }
    super._setUpWithMigrations(version, callback);
  }
}
