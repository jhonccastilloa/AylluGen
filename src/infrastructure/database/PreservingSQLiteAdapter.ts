import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import type { ResultCallback } from '@nozbe/watermelondb/utils/fp/Result';

/** Watermelon 0.28 resets an old DB when no migration path exists. Fail closed
 * instead: an unknown historical schema must be recovered, never silently erased.
 * This narrow internal override must be rechecked when upgrading WatermelonDB.
 */
export class PreservingSQLiteAdapter extends SQLiteAdapter {
  _setUpWithMigrations(version: number, callback: ResultCallback<void>): void {
    if (!this._migrationSteps(version)) {
      callback({
        error: new Error(
          'Versión de base local no soportada. Se conservó la base; solicita soporte antes de continuar.',
        ),
      });
      return;
    }
    super._setUpWithMigrations(version, callback);
  }
}
