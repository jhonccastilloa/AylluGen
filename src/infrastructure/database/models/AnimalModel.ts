import { date, field, readonly, text } from '@nozbe/watermelondb/decorators';
import { DB_TABLES } from '@/infrastructure/database/constants';
import { Model } from '@nozbe/watermelondb';

export class AnimalModel extends Model {
  static table = DB_TABLES.animals;

  @text('crotal') crotal!: string;
  @text('sex') sex!: string;
  @text('species') species!: string;
  @field('species_id') speciesId!: string | null;
  @field('birth_date') birthDate!: number | null;
  @field('is_founder') isFounder!: boolean;
  @field('father_id') fatherId!: string | null;
  @field('mother_id') motherId!: string | null;
  @text('user_id') userId!: string;
  @text('sync_status') recordSyncStatus!: string;
  @field('sync_version') syncVersion!: number;
  @readonly @date('created_at') readonly createdAt!: Date;
  @readonly @date('updated_at') readonly updatedAt!: Date;
  @field('deleted_at') deletedAt!: number | null;
}
