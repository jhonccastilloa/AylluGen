import { date, field, readonly, text } from '@nozbe/watermelondb/decorators';
import { DB_TABLES } from '@/infrastructure/database/constants';
import { Model } from '@nozbe/watermelondb';

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
  @readonly @date('created_at') readonly createdAt!: Date;
  @readonly @date('updated_at') readonly updatedAt!: Date;
}
