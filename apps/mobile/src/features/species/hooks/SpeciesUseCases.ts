import type {
  SpeciesCreateInput,
  SpeciesUpdateInput,
} from '../interfaces/species.types';
import type { SpeciesLocalRepository } from '../services/SpeciesLocalRepository';

const normalizeCode = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');

export class SpeciesUseCases {
  constructor(private readonly local: SpeciesLocalRepository) {}
  list() {
    return this.local.list();
  }
  create(input: SpeciesCreateInput) {
    return this.local.create({
      ...input,
      code: normalizeCode(input.code),
      name: input.name.trim(),
      description: input.description?.trim(),
    });
  }
  update(id: string, input: SpeciesUpdateInput) {
    return this.local.update(id, {
      ...input,
      code: input.code === undefined ? undefined : normalizeCode(input.code),
      name: input.name?.trim(),
      description: input.description?.trim(),
    });
  }
  delete(id: string) {
    return this.local.delete(id);
  }
}
