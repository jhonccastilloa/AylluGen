import { extractApiErrorMessage } from '@/core/utils/apiErrorHandler';
import type {
  Species,
  SpeciesCreateInput,
  SpeciesUpdateInput,
} from '@/features/species/interfaces/species.types';
import { SpeciesApi } from '@/features/species/services/SpeciesApi';

const DEFAULT_SPECIES: Species[] = [
  {
    id: 'fallback-alpaca',
    code: 'ALPACA',
    name: 'Alpaca',
    description: null,
    userId: '',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'fallback-sheep',
    code: 'SHEEP',
    name: 'Sheep',
    description: null,
    userId: '',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'fallback-llama',
    code: 'LLAMA',
    name: 'Llama',
    description: null,
    userId: '',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: 'fallback-vicugna',
    code: 'VICUGNA',
    name: 'Vicugna',
    description: null,
    userId: '',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
];

const normalizeCode = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');

export class SpeciesUseCases {
  constructor(private readonly api: SpeciesApi) {}

  async list(): Promise<Species[]> {
    try {
      const response = await this.api.getAll();
      if (response.species.length === 0) return DEFAULT_SPECIES;
      return response.species.sort((left, right) => left.name.localeCompare(right.name));
    } catch (error) {
      console.warn('No se pudo cargar species', extractApiErrorMessage(error));
      return DEFAULT_SPECIES;
    }
  }

  async create(input: SpeciesCreateInput): Promise<Species> {
    return this.api.create({
      ...input,
      code: normalizeCode(input.code),
      name: input.name.trim(),
      description: input.description?.trim(),
    });
  }

  async update(speciesId: string, input: SpeciesUpdateInput): Promise<Species> {
    return this.api.update(speciesId, {
      code: input.code ? normalizeCode(input.code) : undefined,
      name: input.name?.trim(),
      description: input.description?.trim(),
    });
  }

  delete(speciesId: string): Promise<void> {
    return this.api.delete(speciesId);
  }
}

