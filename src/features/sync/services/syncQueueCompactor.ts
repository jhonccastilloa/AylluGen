import type {
  SyncAction,
  SyncQueueEntry,
} from '@/features/sync/interfaces/sync.types';
import type { DbTableName } from '@/infrastructure/database/constants';

export interface ConsolidatedSyncQueueEntry {
  tableName: DbTableName;
  recordId: string;
  action: SyncAction;
  payload: Record<string, unknown> | null;
  clientVersion: number;
  createdAt: number;
  sourceEntryIds: string[];
}

export const toSyncEntryKey = (tableName: DbTableName, recordId: string): string =>
  `${tableName}:${recordId}`;

const mergePayloads = (
  previous: Record<string, unknown> | null,
  incoming: Record<string, unknown> | null,
): Record<string, unknown> => ({
  ...(previous ?? {}),
  ...(incoming ?? {}),
});

const toConsolidatedEntry = (
  entry: SyncQueueEntry,
): ConsolidatedSyncQueueEntry => ({
  tableName: entry.tableName,
  recordId: entry.recordId,
  action: entry.action,
  payload: entry.payload,
  clientVersion: entry.clientVersion,
  createdAt: entry.createdAt,
  sourceEntryIds: [entry.id],
});

const withMergedSourceIds = (
  base: ConsolidatedSyncQueueEntry,
  incomingEntryId: string,
): ConsolidatedSyncQueueEntry => ({
  ...base,
  sourceEntryIds: [...base.sourceEntryIds, incomingEntryId],
});

const reduceEntries = (
  current: ConsolidatedSyncQueueEntry,
  incoming: SyncQueueEntry,
): ConsolidatedSyncQueueEntry | null => {
  if (current.action === 'CREATE') {
    if (incoming.action === 'DELETE') {
      return null;
    }

    return withMergedSourceIds(
      {
        ...current,
        action: 'CREATE',
        payload: mergePayloads(current.payload, incoming.payload),
        clientVersion: incoming.clientVersion,
      },
      incoming.id,
    );
  }

  if (current.action === 'UPDATE') {
    if (incoming.action === 'DELETE') {
      return withMergedSourceIds(
        {
          ...current,
          action: 'DELETE',
          payload: null,
          clientVersion: incoming.clientVersion,
        },
        incoming.id,
      );
    }

    return withMergedSourceIds(
      {
        ...current,
        action: 'UPDATE',
        payload: mergePayloads(current.payload, incoming.payload),
        clientVersion: incoming.clientVersion,
      },
      incoming.id,
    );
  }

  if (current.action === 'DELETE') {
    if (incoming.action === 'CREATE') {
      return withMergedSourceIds(
        {
          ...current,
          action: 'UPDATE',
          payload: mergePayloads(null, incoming.payload),
          clientVersion: incoming.clientVersion,
        },
        incoming.id,
      );
    }

    return withMergedSourceIds(
      {
        ...current,
        action: 'DELETE',
        payload: null,
        clientVersion: incoming.clientVersion,
      },
      incoming.id,
    );
  }

  return withMergedSourceIds(current, incoming.id);
};

export const consolidateSyncQueueEntries = (
  entries: SyncQueueEntry[],
): ConsolidatedSyncQueueEntry[] => {
  if (entries.length === 0) return [];

  const sortedEntries = [...entries].sort(
    (left, right) => left.createdAt - right.createdAt,
  );
  const consolidatedMap = new Map<string, ConsolidatedSyncQueueEntry>();

  for (const entry of sortedEntries) {
    const key = toSyncEntryKey(entry.tableName, entry.recordId);
    const existingEntry = consolidatedMap.get(key);

    if (!existingEntry) {
      consolidatedMap.set(key, toConsolidatedEntry(entry));
      continue;
    }

    const reducedEntry = reduceEntries(existingEntry, entry);
    if (!reducedEntry) {
      consolidatedMap.delete(key);
      continue;
    }

    consolidatedMap.set(key, reducedEntry);
  }

  return [...consolidatedMap.values()].sort(
    (left, right) => left.createdAt - right.createdAt,
  );
};
