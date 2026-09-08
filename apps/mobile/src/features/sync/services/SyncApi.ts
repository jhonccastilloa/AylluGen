import { ApiService } from '@/infrastructure/api/ApiService';
import type { SyncPullArgs, SyncPushArgs } from '@nozbe/watermelondb/sync';
import { parsePull, projectPush } from './watermelonProtocol';

export class SyncApi {
  constructor(private readonly userId: string) {}
  async pull(args: SyncPullArgs) {
    const response = await ApiService.post<unknown>(
      '/sync/v2/pull',
      {
        lastPulledAt: args.lastPulledAt ?? null,
        schemaVersion: args.schemaVersion,
        migration: args.migration ?? null,
      },
      {
        noLoader: true,
        showErrorToast: false,
        timeoutMs: 60000,
        headers: { 'x-local-account': this.userId },
      },
    );
    return parsePull(response, this.userId, args.lastPulledAt ?? null);
  }
  push(args: SyncPushArgs): Promise<void> {
    return ApiService.post<void>(
      '/sync/v2/push',
      {
        lastPulledAt: args.lastPulledAt,
        changes: projectPush(args.changes),
      },
      {
        noLoader: true,
        showErrorToast: false,
        timeoutMs: 60000,
        headers: { 'x-local-account': this.userId },
      },
    );
  }
}
