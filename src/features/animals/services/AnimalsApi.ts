import { mapClientTimestamps } from '@/features/shared/utils/mapClientTimestamps';
import { ApiService } from '@/infrastructure/api/ApiService';
import type {
  Animal,
  AnimalCreateInput,
  AnimalUpdateInput,
  Sex,
  Species,
} from '@/features/animals/interfaces/animals.types';

export interface AnimalQueryParams {
  species?: Species;
  sex?: Sex;
  isFounder?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

interface AnimalsListResponse {
  animals: Animal[];
  total: number;
}

const appendQueryParam = (
  list: string[],
  key: string,
  value: string | number | boolean | undefined,
) => {
  if (value === undefined || value === null || value === '') return;
  list.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
};

const buildAnimalQuery = (query?: AnimalQueryParams) => {
  if (!query) return '';
  const queryEntries: string[] = [];

  appendQueryParam(queryEntries, 'species', query.species);
  appendQueryParam(queryEntries, 'sex', query.sex);
  appendQueryParam(queryEntries, 'isFounder', query.isFounder);
  appendQueryParam(queryEntries, 'search', query.search);
  appendQueryParam(queryEntries, 'limit', query.limit);
  appendQueryParam(queryEntries, 'offset', query.offset);

  return queryEntries.length > 0 ? `?${queryEntries.join('&')}` : '';
};

export class AnimalsApi {
  create(input: AnimalCreateInput): Promise<Animal> {
    return ApiService.post<Animal>('/animals', input).then(mapClientTimestamps);
  }

  getAll(query?: AnimalQueryParams): Promise<AnimalsListResponse> {
    return ApiService.get<AnimalsListResponse>(`/animals${buildAnimalQuery(query)}`).then(mapClientTimestamps);
  }

  getFounders(): Promise<Animal[]> {
    return ApiService.get<Animal[]>('/animals/founders').then(mapClientTimestamps);
  }

  getMales(): Promise<Animal[]> {
    return ApiService.get<Animal[]>('/animals/males').then(mapClientTimestamps);
  }

  getFemales(): Promise<Animal[]> {
    return ApiService.get<Animal[]>('/animals/females').then(mapClientTimestamps);
  }

  getById(animalId: string): Promise<Animal> {
    return ApiService.get<Animal>(`/animals/${animalId}`).then(mapClientTimestamps);
  }

  getPedigree(animalId: string): Promise<Animal> {
    return ApiService.get<Animal>(`/animals/${animalId}/pedigree`).then(mapClientTimestamps);
  }

  update(animalId: string, input: AnimalUpdateInput): Promise<Animal> {
    return ApiService.put<Animal>(`/animals/${animalId}`, input).then(mapClientTimestamps);
  }

  delete(animalId: string): Promise<void> {
    return ApiService.delete<void>(`/animals/${animalId}`).then(mapClientTimestamps);
  }
}

