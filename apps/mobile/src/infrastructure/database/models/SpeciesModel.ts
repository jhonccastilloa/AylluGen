import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, text } from '@nozbe/watermelondb/decorators';

export class SpeciesModel extends Model {
  static table = 'species';
  @text('code') code!: string;
  @text('name') name!: string;
  @field('description') description!: string | null;
  @text('user_id') userId!: string;
  @readonly @date('created_at') readonly createdAt!: Date;
  @readonly @date('updated_at') readonly updatedAt!: Date;
}
