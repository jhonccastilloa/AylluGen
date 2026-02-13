import { AnimalsApi } from '@/features/animals/services/AnimalsApi';
import { AnimalsLocalRepository } from '@/features/animals/services/AnimalsLocalRepository';
import { AnimalsUseCases } from '@/features/animals/hooks/AnimalsUseCases';
import { BreedingsApi } from '@/features/breedings/services/BreedingsApi';
import { BreedingsLocalRepository } from '@/features/breedings/services/BreedingsLocalRepository';
import { BreedingsUseCases } from '@/features/breedings/hooks/BreedingsUseCases';
import { HealthApi } from '@/features/health/services/HealthApi';
import { HealthLocalRepository } from '@/features/health/services/HealthLocalRepository';
import { HealthUseCases } from '@/features/health/hooks/HealthUseCases';
import { ProductionApi } from '@/features/production/services/ProductionApi';
import { ProductionLocalRepository } from '@/features/production/services/ProductionLocalRepository';
import { ProductionUseCases } from '@/features/production/hooks/ProductionUseCases';
import { UsersApi } from '@/features/users/services/UsersApi';
import { UsersUseCases } from '@/features/users/hooks/UsersUseCases';
import { SpeciesApi } from '@/features/species/services/SpeciesApi';
import { SpeciesUseCases } from '@/features/species/hooks/SpeciesUseCases';
import { SyncApi } from '@/features/sync/services/SyncApi';
import { SyncQueueRepository } from '@/features/sync/services/SyncQueueRepository';
import { SyncOrchestrator } from '@/features/sync/hooks/SyncOrchestrator';

const animalsLocalRepository = new AnimalsLocalRepository();
const breedingsLocalRepository = new BreedingsLocalRepository();
const healthLocalRepository = new HealthLocalRepository();
const productionLocalRepository = new ProductionLocalRepository();

const syncQueueRepository = new SyncQueueRepository();
const syncApi = new SyncApi();

const sync = new SyncOrchestrator({
  animalsLocalRepository,
  breedingsLocalRepository,
  healthLocalRepository,
  productionLocalRepository,
  syncQueueRepository,
  syncApi,
});

const animals = new AnimalsUseCases(
  new AnimalsApi(),
  animalsLocalRepository,
  sync,
);
const breedings = new BreedingsUseCases(
  new BreedingsApi(),
  breedingsLocalRepository,
  sync,
);
const health = new HealthUseCases(new HealthApi(), healthLocalRepository, sync);
const production = new ProductionUseCases(
  new ProductionApi(),
  productionLocalRepository,
  sync,
);
const users = new UsersUseCases(new UsersApi());
const species = new SpeciesUseCases(new SpeciesApi());

const featureContainer = {
  animals,
  breedings,
  health,
  production,
  users,
  species,
  sync,
};

export type FeatureContainer = typeof featureContainer;
export { featureContainer };
export default featureContainer;
