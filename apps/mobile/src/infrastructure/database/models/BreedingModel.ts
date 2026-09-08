import { date, field, readonly, text } from '@nozbe/watermelondb/decorators';
import { DB_TABLES } from '@/infrastructure/database/constants';
import { Model } from '@nozbe/watermelondb';

export class BreedingModel extends Model {
  static table = DB_TABLES.breedings;

  @text('male_id') maleId!: string;
  @text('female_id') femaleId!: string;
  @field('projected_coi') projectedCoi!: number;
  @text('risk_level') riskLevel!: string;
  @field('offspring_id') offspringId!: string | null;
  @field('breeding_date') breedingDate!: number | null;
  @field('notes') notes!: string | null;
  @text('user_id') userId!: string;
  @text('sync_status') recordSyncStatus!: string;
  @field('sync_version') syncVersion!: number;
  @readonly @date('created_at') readonly createdAt!: Date;
  @readonly @date('updated_at') readonly updatedAt!: Date;
}
