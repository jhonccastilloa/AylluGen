import { AnimalModel } from './models/AnimalModel';
import { BreedingModel } from './models/BreedingModel';
import { HealthRecordModel } from './models/HealthRecordModel';
import { ProductionRecordModel } from './models/ProductionRecordModel';
import { databaseSchema } from './schema';
import { restoreSyncedTimestamps } from './restoreSyncedTimestamps';

it.each([AnimalModel, BreedingModel, HealthRecordModel, ProductionRecordModel])(
  '%s generates local dates, protects setters and restores original dates on another device',
  ModelClass => {
    const collection = {
      schema: databaseSchema.tables[ModelClass.table],
      database: { experimentalIsVerbose: false },
    };
    const now = jest.spyOn(Date, 'now').mockReturnValue(10000);
    try {
      // Exercise real WatermelonDB decorators and lifecycle without a native adapter.
      const model = ModelClass._prepareCreate(collection as never, () => {}) as AnimalModel;
      expect(model.createdAt.getTime()).toBe(10000);
      expect(model.updatedAt.getTime()).toBe(10000);
      expect(() => Object.assign(model, { createdAt: new Date(1) })).toThrow();
      model._preparedState = null;
      now.mockReturnValue(20000);
      model.prepareUpdate(() => {});
      model._preparedState = null;
      expect(model.createdAt.getTime()).toBe(10000);
      expect(model.updatedAt.getTime()).toBe(20000);
      model.prepareUpdate(item => restoreSyncedTimestamps(item, new Date(1000), new Date(2000)));
      model._preparedState = null;
      expect(model.createdAt.getTime()).toBe(1000);
      expect(model.updatedAt.getTime()).toBe(2000);
    } finally {
      now.mockRestore();
    }
  },
);
