/**
 * API records keep server timestamps on the wire. The app's domain dates
 * represent the originating device's actions, including nested/list responses.
 * Older records without client dates fall back to the server dates.
 */
export function mapClientTimestamps<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => mapClientTimestamps(item)) as T;
  }
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  const mapped = Object.fromEntries(
    Object.entries(record).map(([key, item]) => [key, mapClientTimestamps(item)]),
  );
  if (typeof record.clientCreatedAt === 'string') mapped.createdAt = record.clientCreatedAt;
  if (typeof record.clientUpdatedAt === 'string') mapped.updatedAt = record.clientUpdatedAt;
  return mapped as T;
}
