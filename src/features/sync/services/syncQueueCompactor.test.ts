import type { SyncQueueEntry } from '@/features/sync/interfaces/sync.types';
import { DB_TABLES } from '@/infrastructure/database/constants';
import {
  consolidateSyncQueueEntries,
  toSyncEntryKey,
} from '@/features/sync/services/syncQueueCompactor';

const makeEntry = (partial: Partial<SyncQueueEntry>): SyncQueueEntry => ({
  id: partial.id ?? 'entry-id',
  tableName: partial.tableName ?? DB_TABLES.animals,
  recordId: partial.recordId ?? 'record-id',
  action: partial.action ?? 'UPDATE',
  payload: partial.payload ?? null,
  clientVersion: partial.clientVersion ?? 1,
  createdAt: partial.createdAt ?? 1,
});

describe('syncQueueCompactor', () => {
  it('collapses create + updates into one create entry', () => {
    const entries: SyncQueueEntry[] = [
      makeEntry({
        id: 'a',
        action: 'CREATE',
        payload: { crotal: 'A-001', sex: 'MALE' },
        clientVersion: 1,
        createdAt: 10,
      }),
      makeEntry({
        id: 'b',
        action: 'UPDATE',
        payload: { isFounder: true },
        clientVersion: 2,
        createdAt: 20,
      }),
      makeEntry({
        id: 'c',
        action: 'UPDATE',
        payload: { crotal: 'A-001-R' },
        clientVersion: 3,
        createdAt: 30,
      }),
    ];

    const [result] = consolidateSyncQueueEntries(entries);

    expect(result.action).toBe('CREATE');
    expect(result.clientVersion).toBe(3);
    expect(result.payload).toEqual({
      crotal: 'A-001-R',
      sex: 'MALE',
      isFounder: true,
    });
    expect(result.sourceEntryIds).toEqual(['a', 'b', 'c']);
  });

  it('drops queued operations when a create is deleted before sync', () => {
    const entries: SyncQueueEntry[] = [
      makeEntry({
        id: 'create',
        action: 'CREATE',
        payload: { crotal: 'A-002' },
        createdAt: 5,
      }),
      makeEntry({
        id: 'delete',
        action: 'DELETE',
        payload: null,
        clientVersion: 2,
        createdAt: 8,
      }),
    ];

    const result = consolidateSyncQueueEntries(entries);
    expect(result).toEqual([]);
  });

  it('converts update + delete into one delete entry', () => {
    const entries: SyncQueueEntry[] = [
      makeEntry({
        id: 'u1',
        action: 'UPDATE',
        payload: { notes: 'old' },
        clientVersion: 5,
        createdAt: 10,
      }),
      makeEntry({
        id: 'd1',
        action: 'DELETE',
        payload: null,
        clientVersion: 6,
        createdAt: 11,
      }),
    ];

    const [result] = consolidateSyncQueueEntries(entries);

    expect(result.action).toBe('DELETE');
    expect(result.payload).toBeNull();
    expect(result.clientVersion).toBe(6);
    expect(result.sourceEntryIds).toEqual(['u1', 'd1']);
  });

  it('keeps deterministic order across records using first queued timestamp', () => {
    const entries: SyncQueueEntry[] = [
      makeEntry({
        id: 'r2-create',
        tableName: DB_TABLES.healthRecords,
        recordId: 'record-2',
        action: 'CREATE',
        payload: { animalId: 'animal-2' },
        createdAt: 50,
      }),
      makeEntry({
        id: 'r1-update',
        tableName: DB_TABLES.animals,
        recordId: 'record-1',
        action: 'UPDATE',
        payload: { crotal: 'A-101' },
        createdAt: 10,
      }),
    ];

    const result = consolidateSyncQueueEntries(entries);
    expect(result.map(entry => toSyncEntryKey(entry.tableName, entry.recordId))).toEqual([
      'animals:record-1',
      'health_records:record-2',
    ]);
  });
});
