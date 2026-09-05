import type { Model } from '@nozbe/watermelondb';

// Only call inside a create/update callback when importing a remote record.
// Preserve the originating device's dates, including when downloading to a new device.
// _setRaw is an internal WatermelonDB API, isolated here to bypass readonly setters.
export function restoreSyncedTimestamps(
  model: Model,
  createdAt: Date,
  updatedAt: Date,
): void {
  if (!Number.isFinite(createdAt.getTime()) || !Number.isFinite(updatedAt.getTime())) {
    throw new Error('Invalid synchronized timestamps');
  }
  model._setRaw('created_at', createdAt.getTime());
  model._setRaw('updated_at', updatedAt.getTime());
}
