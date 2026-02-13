import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';
import { DB_TABLES } from '@/infrastructure/database/constants';

export class AppMetaModel extends Model {
  static table = DB_TABLES.appMeta;

  @text('meta_key') metaKey!: string;
  @text('meta_value') metaValue!: string;
  @field('updated_at') updatedAt!: number;
}
