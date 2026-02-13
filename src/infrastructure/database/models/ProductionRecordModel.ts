import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';
import { DB_TABLES } from '@/infrastructure/database/constants';

export class ProductionRecordModel extends Model {
  static table = DB_TABLES.productionRecords;

  @text('animal_id') animalId!: string;
  @text('type') type!: string;
  @field('date') date!: number;
  @field('value') value!: number;
  @text('unit') unit!: string;
  @field('quality_score') qualityScore!: number | null;
  @field('notes') notes!: string | null;
  @text('user_id') userId!: string;
  @text('sync_status') recordSyncStatus!: string;
  @field('sync_version') syncVersion!: number;
  @field('created_at') createdAt!: number;
  @field('updated_at') updatedAt!: number;
}
