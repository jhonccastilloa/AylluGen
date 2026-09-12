import type { Database } from '@nozbe/watermelondb';
import type { SpeciesUnitOfWork, SpeciesSession } from '@ayllugen/core/species/unit-of-work';
import { WatermelonSpeciesRepository } from './WatermelonSpeciesRepository';

export class WatermelonSpeciesUnitOfWork implements SpeciesUnitOfWork {
  constructor(
    private readonly database: Database,
    private readonly ownerId: string,
  ) {}
  private session(ownerId: string): SpeciesSession {
    if (ownerId !== this.ownerId) throw new Error('Cuenta local inválida.');
    const repository = new WatermelonSpeciesRepository(this.database, ownerId);
    return { species: repository, usage: repository };
  }
  async read<R>(
    ownerId: string,
    work: (session: SpeciesSession) => Promise<R>,
  ): Promise<R> {
    return work(this.session(ownerId));
  }
  async write<R>(
    ownerId: string,
    work: (session: SpeciesSession) => Promise<R>,
  ): Promise<R> {
    const session = this.session(ownerId);
    return this.database.write(() => work(session));
  }
}
