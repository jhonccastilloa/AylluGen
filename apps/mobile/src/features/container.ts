import { AnimalsLocalRepository } from '@/features/animals/services/AnimalsLocalRepository';
import { AnimalsUseCases } from '@/features/animals/hooks/AnimalsUseCases';
import { BreedingsApi } from '@/features/breedings/services/BreedingsApi';
import { BreedingsLocalRepository } from '@/features/breedings/services/BreedingsLocalRepository';
import { BreedingsUseCases } from '@/features/breedings/hooks/BreedingsUseCases';
import { HealthLocalRepository } from '@/features/health/services/HealthLocalRepository';
import { HealthUseCases } from '@/features/health/hooks/HealthUseCases';
import { ProductionLocalRepository } from '@/features/production/services/ProductionLocalRepository';
import { ProductionUseCases } from '@/features/production/hooks/ProductionUseCases';
import { UsersApi } from '@/features/users/services/UsersApi';
import { UsersUseCases } from '@/features/users/hooks/UsersUseCases';
import { SpeciesUseCases } from '@/features/species/hooks/SpeciesUseCases';
import { SyncApi } from '@/features/sync/services/SyncApi';
import { SyncOrchestrator } from '@/features/sync/hooks/SyncOrchestrator';

import authSession from '@/infrastructure/auth/AuthSession';
import {
  createDatabase,
  getLegacyDatabase,
  databaseReady,
} from '@/infrastructure/database';
import { importLegacy } from '@/infrastructure/database/importLegacy';
import { uuid } from '@/features/sync/services/watermelonProtocol';
import { SpeciesLocalRepository } from '@/features/species/services/SpeciesLocalRepository';

function buildAccount(userId: string) {
  uuid.parse(userId); // safe, collision-free database filename
  const database = createDatabase(`ayllugen_sync_${userId}`);
  const archive = getLegacyDatabase();
  const ready = Promise.all([
    databaseReady(database),
    databaseReady(archive),
  ]).then(() => importLegacy(archive, database, userId));
  const sync = new SyncOrchestrator(
    database,
    userId,
    new SyncApi(userId),
    ready,
  );
  return {
    userId,
    database,
    ready,
    sync,
    animals: new AnimalsUseCases(new AnimalsLocalRepository(database, userId)),
    breedings: new BreedingsUseCases(
      new BreedingsApi(),
      new BreedingsLocalRepository(database, userId),
    ),
    health: new HealthUseCases(new HealthLocalRepository(database, userId)),
    production: new ProductionUseCases(
      new ProductionLocalRepository(database, userId),
    ),
    species: new SpeciesUseCases(new SpeciesLocalRepository(database, userId)),
  };
}
export type AccountContainer = ReturnType<typeof buildAccount>;
const accounts = new Map<string, AccountContainer>();

export function getAccountContainer(): AccountContainer {
  const userId = authSession.getUser()?.id;
  if (!userId)
    throw new Error('Se requiere una sesión para acceder a los datos locales.');
  let account = accounts.get(userId);
  if (!account) {
    account = buildAccount(userId);
    accounts.set(userId, account);
  }
  return account;
}
authSession.subscribe(session => {
  accounts.forEach(account => {
    if (account.userId !== session.user?.id) account.sync.stop();
  });
});

// Existing screens retain the container API; each operation resolves the current account.
// Repositories and in-flight synchronizations capture their database, never a mutable global.
const featureContainer = {
  get animals() {
    return getAccountContainer().animals;
  },
  get breedings() {
    return getAccountContainer().breedings;
  },
  get health() {
    return getAccountContainer().health;
  },
  get production() {
    return getAccountContainer().production;
  },
  get species() {
    return getAccountContainer().species;
  },
  get sync() {
    return getAccountContainer().sync;
  },
  users: new UsersUseCases(new UsersApi()),
};
export type FeatureContainer = typeof featureContainer;
export { featureContainer };
export default featureContainer;
