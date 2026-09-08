import { mapClientTimestamps } from '@/features/shared/utils/mapClientTimestamps';
import { ApiService } from '@/infrastructure/api/ApiService';
import type {
  BreedingMatchInput,
  CoiCalculationResponse,
} from '@/features/breedings/interfaces/breedings.types';

export class BreedingsApi {
  calculateCoi(input: BreedingMatchInput): Promise<CoiCalculationResponse> {
    return ApiService.post<CoiCalculationResponse>(
      '/breedings/calculate-coi',
      input,
    ).then(mapClientTimestamps);
  }
}
