import { Q } from '@nozbe/watermelondb';
import { database } from '@/infrastructure/database';
import { DB_TABLES } from '@/infrastructure/database/constants';
import type { AnimalModel } from '@/infrastructure/database/models/AnimalModel';
import type {
  Animal,
  AnimalCreateInput,
  AnimalUpdateInput,
  Sex,
  Species,
} from '@/features/animals/interfaces/animals.types';
import type { SyncStatus } from '@/features/shared/interfaces/common.types';
import {
  isoToTimestamp,
  nowTimestamp,
  timestampToIso,
} from '@/features/shared/utils/date';
import { generateUuid } from '@/features/shared/utils/id';

const toIsoOrEmpty = (value?: number | null): string =>
  timestampToIso(value) ?? new Date(0).toISOString();

const toDomain = (model: AnimalModel): Animal => ({
  id: model.id,
  crotal: model.crotal,
  sex: model.sex as Sex,
  speciesId: null,
  species: model.species as Species,
  speciesName: model.species as Species,
  birthDate: timestampToIso(model.birthDate),
  isFounder: model.isFounder,
  fatherId: model.fatherId ?? null,
  motherId: model.motherId ?? null,
  userId: model.userId,
  syncStatus: model.recordSyncStatus as SyncStatus,
  syncVersion: model.syncVersion,
  createdAt: toIsoOrEmpty(model.createdAt),
  updatedAt: toIsoOrEmpty(model.updatedAt),
  deletedAt: timestampToIso(model.deletedAt),
});

export interface AnimalsFilter {
  search?: string;
  sex?: Sex;
  species?: Species;
  isFounder?: boolean;
}

export class AnimalsLocalRepository {
  private collection = database.get<AnimalModel>(DB_TABLES.animals);

  async listByUserId(userId: string, filter?: AnimalsFilter): Promise<Animal[]> {
    const records = await this.collection.query(Q.where('user_id', userId)).fetch();
    let animals = records.map(toDomain).filter(animal => !animal.deletedAt);

    if (filter?.search) {
      const normalizedSearch = filter.search.toLowerCase().trim();
      animals = animals.filter(animal =>
        animal.crotal.toLowerCase().includes(normalizedSearch),
      );
    }

    if (filter?.sex) {
      animals = animals.filter(animal => animal.sex === filter.sex);
    }

    if (filter?.species) {
      animals = animals.filter(animal => animal.species === filter.species);
    }

    if (typeof filter?.isFounder === 'boolean') {
      animals = animals.filter(animal => animal.isFounder === filter.isFounder);
    }

    return animals.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getById(id: string): Promise<Animal | null> {
    try {
      const model = await this.collection.find(id);
      const animal = toDomain(model);
      return animal.deletedAt ? null : animal;
    } catch {
      return null;
    }
  }

  async createLocal(userId: string, input: AnimalCreateInput): Promise<Animal> {
    const timestamp = nowTimestamp();
    const id = generateUuid();
    const birthDate = isoToTimestamp(input.birthDate);

    await database.write(async () => {
      await this.collection.create(record => {
        (record._raw as { id: string }).id = id;
        record.crotal = input.crotal;
        record.sex = input.sex;
        record.species = (input.speciesCode ?? input.species) as Species;
        record.birthDate = birthDate;
        record.isFounder = input.isFounder ?? false;
        record.fatherId = input.fatherId ?? null;
        record.motherId = input.motherId ?? null;
        record.userId = userId;
        record.recordSyncStatus = 'PENDING';
        record.syncVersion = 1;
        record.createdAt = timestamp;
        record.updatedAt = timestamp;
        record.deletedAt = null;
      });
    });

    const createdAnimal = await this.getById(id);
    if (!createdAnimal) {
      throw new Error('No se pudo crear el animal localmente');
    }

    return createdAnimal;
  }

  async updateLocal(id: string, input: AnimalUpdateInput): Promise<Animal | null> {
    try {
      await database.write(async () => {
        const model = await this.collection.find(id);
        await model.update(record => {
          if (input.crotal !== undefined) record.crotal = input.crotal;
          if (input.speciesCode !== undefined) {
            record.species = input.speciesCode as Species;
          }
          if (input.birthDate !== undefined) {
            record.birthDate = isoToTimestamp(input.birthDate);
          }
          if (input.isFounder !== undefined) {
            record.isFounder = input.isFounder;
          }
          if (input.fatherId !== undefined) {
            record.fatherId = input.fatherId ?? null;
          }
          if (input.motherId !== undefined) {
            record.motherId = input.motherId ?? null;
          }
          record.recordSyncStatus = 'PENDING';
          record.syncVersion += 1;
          record.updatedAt = nowTimestamp();
        });
      });

      return this.getById(id);
    } catch {
      return null;
    }
  }

  async softDeleteLocal(id: string): Promise<number | null> {
    let deletedVersion: number | null = null;

    try {
      await database.write(async () => {
        const model = await this.collection.find(id);
        await model.update(record => {
          record.recordSyncStatus = 'DELETED';
          record.deletedAt = nowTimestamp();
          record.syncVersion += 1;
          deletedVersion = record.syncVersion;
          record.updatedAt = nowTimestamp();
        });
      });
      return deletedVersion;
    } catch {
      return null;
    }
  }

  async upsertFromServer(records: Animal[]): Promise<void> {
    await database.write(async () => {
      for (const record of records) {
        try {
          const existing = await this.collection.find(record.id);
          await existing.update(item => {
            item.crotal = record.crotal;
            item.sex = record.sex;
            item.species = record.species;
            item.birthDate = isoToTimestamp(record.birthDate);
            item.isFounder = record.isFounder;
            item.fatherId = record.fatherId;
            item.motherId = record.motherId;
            item.userId = record.userId;
            item.recordSyncStatus = record.syncStatus;
            item.syncVersion = record.syncVersion;
            item.createdAt = isoToTimestamp(record.createdAt) ?? nowTimestamp();
            item.updatedAt = isoToTimestamp(record.updatedAt) ?? nowTimestamp();
            item.deletedAt = isoToTimestamp(record.deletedAt);
          });
        } catch {
          await this.collection.create(item => {
            (item._raw as { id: string }).id = record.id;
            item.crotal = record.crotal;
            item.sex = record.sex;
            item.species = record.species;
            item.birthDate = isoToTimestamp(record.birthDate);
            item.isFounder = record.isFounder;
            item.fatherId = record.fatherId;
            item.motherId = record.motherId;
            item.userId = record.userId;
            item.recordSyncStatus = record.syncStatus;
            item.syncVersion = record.syncVersion;
            item.createdAt = isoToTimestamp(record.createdAt) ?? nowTimestamp();
            item.updatedAt = isoToTimestamp(record.updatedAt) ?? nowTimestamp();
            item.deletedAt = isoToTimestamp(record.deletedAt);
          });
        }
      }
    });
  }

  async getFounders(userId: string): Promise<Animal[]> {
    return this.listByUserId(userId, { isFounder: true });
  }

  async getMales(userId: string): Promise<Animal[]> {
    return this.listByUserId(userId, { sex: 'MALE' });
  }

  async getFemales(userId: string): Promise<Animal[]> {
    return this.listByUserId(userId, { sex: 'FEMALE' });
  }
}

