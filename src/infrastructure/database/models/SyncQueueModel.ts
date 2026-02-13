import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';
import { DB_TABLES } from '@/infrastructure/database/constants';

export class SyncQueueModel extends Model {
  static table = DB_TABLES.syncQueue;

  @text('table_name') tableName!: string;
  @text('record_id') recordId!: string;
  @text('action') action!: string;
  @field('payload') payload!: string | null;
  @field('client_version') clientVersion!: number;
  @field('created_at') createdAt!: number;
}
