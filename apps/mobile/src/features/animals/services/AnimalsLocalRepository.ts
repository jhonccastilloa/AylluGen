import { Q } from '@nozbe/watermelondb';
import type { Database } from '@nozbe/watermelondb';
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
import { isoToTimestamp, timestampToIso } from '@/features/shared/utils/date';
import { generateUuid } from '@/features/shared/utils/id';
import {
  inputRaw,
  validateLocalRecord,
} from '@/infrastructure/database/localRules';
import type { SpeciesModel } from '@/infrastructure/database/models/SpeciesModel';
import type { BreedingModel } from '@/infrastructure/database/models/BreedingModel';

const toIsoOrEmpty = (value?: Date | null): string =>
  value?.toISOString() ?? new Date(0).toISOString();

const toDomain = (model: AnimalModel): Animal => ({
  id: model.id,
  crotal: model.crotal,
  sex: model.sex as Sex,
  speciesId: model.speciesId,
  species: model.species as Species,
  speciesName: model.species as Species,
  birthDate: timestampToIso(model.birthDate),
  isFounder: model.isFounder,
  fatherId: model.fatherId ?? null,
  motherId: model.motherId ?? null,
  userId: model.userId,
  syncStatus: (model.syncStatus === 'synced'
    ? 'SYNCED'
    : 'PENDING') as SyncStatus,
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
  constructor(
    private readonly database: Database,
    private readonly ownerId: string,
  ) {}

  private get collection() {
    return this.database.get<AnimalModel>(DB_TABLES.animals);
  }

  async listByUserId(
    userId: string,
    filter?: AnimalsFilter,
  ): Promise<Animal[]> {
    if (userId !== this.ownerId) throw new Error('Cuenta local inválida.');
    const records = await this.collection
      .query(Q.where('user_id', userId))
      .fetch();
    const species = new Map(
      (await this.database.get<SpeciesModel>('species').query().fetch()).map(
        r => [r.id, r],
      ),
    );
    let animals = records
      .map(row => {
        const item = toDomain(row);
        const kind = species.get(row.speciesId ?? '');
        return {
          ...item,
          species: kind?.code ?? item.species,
          speciesName: kind?.name ?? item.speciesName,
        };
      })
      .filter(animal => !animal.deletedAt);

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

    return animals.sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  async getById(id: string): Promise<Animal | null> {
    try {
      const model = await this.collection.find(id);
      if (model.syncStatus === 'deleted') return null;
      const animal = toDomain(model);
      const kind = model.speciesId
        ? (
            await this.database
              .get<SpeciesModel>('species')
              .query(Q.where('id', model.speciesId))
              .fetch()
          )[0]
        : undefined;
      if (kind) {
        animal.species = kind.code;
        animal.speciesName = kind.name;
      }
      return animal.deletedAt ? null : animal;
    } catch {
      return null;
    }
  }

  async createLocal(userId: string, input: AnimalCreateInput): Promise<Animal> {
    if (userId !== this.ownerId) throw new Error('Cuenta local inválida.');
    const id = generateUuid();
    const birthDate =
      input.birthDate === undefined ? null : Date.parse(input.birthDate);

    await this.database.write(async () => {
      const species = (
        await this.database
          .get<SpeciesModel>('species')
          .query(
            input.speciesId
              ? Q.where('id', input.speciesId)
              : Q.where('code', input.speciesCode ?? input.species),
          )
          .fetch()
      )[0];
      if (!species)
        throw new Error('Selecciona o crea primero una especie local.');
      input = { ...input, speciesId: species.id, speciesCode: species.code };
      await validateLocalRecord(this.database, 'animals', {
        id,
        crotal: input.crotal,
        sex: input.sex,
        species_id: species.id,
        birth_date: birthDate,
        is_founder: input.isFounder ?? false,
        father_id: input.fatherId ?? null,
        mother_id: input.motherId ?? null,
      });
      await this.collection.create(record => {
        (record._raw as { id: string }).id = id;
        record.crotal = input.crotal;
        record.sex = input.sex;
        record.species = (input.speciesCode ?? input.species) as Species;
        record.speciesId = input.speciesId ?? null;
        record.birthDate = birthDate;
        record.isFounder = input.isFounder ?? false;
        record.fatherId = input.fatherId ?? null;
        record.motherId = input.motherId ?? null;
        record.userId = userId;
        record.recordSyncStatus = 'PENDING';
        record.syncVersion = 1;
        record.deletedAt = null;
      });
    });

    const createdAnimal = await this.getById(id);
    if (!createdAnimal) {
      throw new Error('No se pudo crear el animal localmente');
    }

    return createdAnimal;
  }

  async updateLocal(
    id: string,
    input: AnimalUpdateInput,
  ): Promise<Animal | null> {
    await this.database.write(async () => {
      const model = await this.collection.find(id);
      if (model.syncStatus === 'deleted')
        throw new Error('El registro fue eliminado.');
      await validateLocalRecord(
        this.database,
        'animals',
        inputRaw(id, input, model._raw),
      );
      await model.update(record => {
        if (input.speciesId !== undefined) record.speciesId = input.speciesId;
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
      });
    });

    return this.getById(id);
  }

  async softDeleteLocal(id: string): Promise<number | null> {
    return this.database.write(async () => {
      const records = await this.collection.query(Q.where('id', id)).fetch();
      if (!records.length) return null;
      const [children, pairs, health, production] = await Promise.all([
        this.collection
          .query(Q.or(Q.where('father_id', id), Q.where('mother_id', id)))
          .fetch(),
        this.database
          .get<BreedingModel>('breedings')
          .query(
            Q.or(
              Q.where('male_id', id),
              Q.where('female_id', id),
              Q.where('offspring_id', id),
            ),
          )
          .fetch(),
        this.database
          .get('health_records')
          .query(Q.where('animal_id', id))
          .fetch(),
        this.database
          .get('production_records')
          .query(Q.where('animal_id', id))
          .fetch(),
      ]);
      await this.database.batch([
        records[0].prepareMarkAsDeleted(),
        ...children.map(child =>
          child.prepareUpdate(r => {
            if (r.fatherId === id) r.fatherId = null;
            if (r.motherId === id) r.motherId = null;
          }),
        ),
        ...pairs.map(pair =>
          pair.maleId === id || pair.femaleId === id
            ? pair.prepareMarkAsDeleted()
            : pair.prepareUpdate(r => {
                r.offspringId = null;
              }),
        ),
        ...health.map(r => r.prepareMarkAsDeleted()),
        ...production.map(r => r.prepareMarkAsDeleted()),
      ]);
      return 1;
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
