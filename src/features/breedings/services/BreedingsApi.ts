import { mapClientTimestamps } from '@/features/shared/utils/mapClientTimestamps';
import { ApiService } from '@/infrastructure/api/ApiService';
import type {
  Breeding,
  BreedingCreateInput,
  BreedingMatchInput,
  BreedingUpdateInput,
  CoiCalculationResponse,
} from '@/features/breedings/interfaces/breedings.types';

interface BreedingListResponse {
  breedings: Breeding[];
}

export class BreedingsApi {
  calculateCoi(input: BreedingMatchInput): Promise<CoiCalculationResponse> {
    return ApiService.post<CoiCalculationResponse>('/breedings/calculate-coi', input).then(mapClientTimestamps);
  }

  create(input: BreedingCreateInput): Promise<Breeding> {
    return ApiService.post<Breeding>('/breedings', input).then(mapClientTimestamps);
  }

  getAll(): Promise<BreedingListResponse> {
    return ApiService.get<BreedingListResponse>('/breedings').then(mapClientTimestamps);
  }

  getById(breedingId: string): Promise<Breeding> {
    return ApiService.get<Breeding>(`/breedings/${breedingId}`).then(mapClientTimestamps);
  }

  getHistory(animalId: string): Promise<BreedingListResponse> {
    return ApiService.get<BreedingListResponse>(`/breedings/history/${animalId}`).then(mapClientTimestamps);
  }

  update(breedingId: string, input: BreedingUpdateInput): Promise<Breeding> {
    return ApiService.put<Breeding>(`/breedings/${breedingId}`, input).then(mapClientTimestamps);
  }

  delete(breedingId: string): Promise<void> {
    return ApiService.delete<void>(`/breedings/${breedingId}`).then(mapClientTimestamps);
  }
}

