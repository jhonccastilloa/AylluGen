import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';
import { DB_TABLES } from '@/infrastructure/database/constants';

export class AnimalModel extends Model {
  static table = DB_TABLES.animals;

  @text('crotal') crotal!: string;
  @text('sex') sex!: string;
  @text('species') species!: string;
  @field('birth_date') birthDate!: number | null;
  @field('is_founder') isFounder!: boolean;
  @field('father_id') fatherId!: string | null;
  @field('mother_id') motherId!: string | null;
  @text('user_id') userId!: string;
  @text('sync_status') recordSyncStatus!: string;
  @field('sync_version') syncVersion!: number;
  @field('created_at') createdAt!: number;
  @field('updated_at') updatedAt!: number;
  @field('deleted_at') deletedAt!: number | null;
}
