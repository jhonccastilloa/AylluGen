import { ApiService } from '@/infrastructure/api/ApiService';
import type {
  Species,
  SpeciesCreateInput,
  SpeciesUpdateInput,
} from '@/features/species/interfaces/species.types';

interface SpeciesListResponse {
  species: Species[];
}

export class SpeciesApi {
  getAll(): Promise<SpeciesListResponse> {
    return ApiService.get<SpeciesListResponse>('/species');
  }

  getById(speciesId: string): Promise<Species> {
    return ApiService.get<Species>(`/species/${speciesId}`);
  }

  create(input: SpeciesCreateInput): Promise<Species> {
    return ApiService.post<Species>('/species', input);
  }

  update(speciesId: string, input: SpeciesUpdateInput): Promise<Species> {
    return ApiService.put<Species>(`/species/${speciesId}`, input);
  }

  delete(speciesId: string): Promise<void> {
    return ApiService.delete<void>(`/species/${speciesId}`);
  }
}

