import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';
import { DB_TABLES } from '@/infrastructure/database/constants';

export class HealthRecordModel extends Model {
  static table = DB_TABLES.healthRecords;

  @text('animal_id') animalId!: string;
  @text('type') type!: string;
  @field('date') date!: number;
  @field('notes') notes!: string | null;
  @field('next_due_date') nextDueDate!: number | null;
  @field('completed') completed!: boolean;
  @text('user_id') userId!: string;
  @text('sync_status') recordSyncStatus!: string;
  @field('sync_version') syncVersion!: number;
  @field('created_at') createdAt!: number;
  @field('updated_at') updatedAt!: number;
}
