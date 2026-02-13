import { ApiService } from '@/infrastructure/api/ApiService';
import type {
  ProductionRecord,
  ProductionRecordCreateInput,
  ProductionRecordUpdateInput,
  ProductionSummary,
  ProductionType,
} from '@/features/production/interfaces/production.types';

interface ProductionListResponse {
  records: ProductionRecord[];
}

interface ProductionFilters {
  animalId?: string;
  type?: ProductionType;
}

const buildQuery = (params?: Record<string, unknown>) => {
  if (!params) return '';
  const queryEntries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );
  const queryString = queryEntries.join('&');
  return queryString ? `?${queryString}` : '';
};

export class ProductionApi {
  create(input: ProductionRecordCreateInput): Promise<ProductionRecord> {
    return ApiService.post<ProductionRecord>('/production', input);
  }

  getAll(filters?: ProductionFilters): Promise<ProductionListResponse> {
    return ApiService.get<ProductionListResponse>(
      `/production${buildQuery(filters as Record<string, unknown> | undefined)}`,
    );
  }

  getById(id: string): Promise<ProductionRecord> {
    return ApiService.get<ProductionRecord>(`/production/${id}`);
  }

  getSummary(animalId: string, type: ProductionType): Promise<ProductionSummary> {
    return ApiService.get<ProductionSummary>(
      `/production/animal/${animalId}/summary/${type}`,
    );
  }

  getRecent(animalId: string, limit?: number): Promise<ProductionListResponse> {
    return ApiService.get<ProductionListResponse>(
      `/production/animal/${animalId}/recent${buildQuery({ limit })}`,
    );
  }

  update(id: string, input: ProductionRecordUpdateInput): Promise<ProductionRecord> {
    return ApiService.put<ProductionRecord>(`/production/${id}`, input);
  }

  delete(id: string): Promise<void> {
    return ApiService.delete<void>(`/production/${id}`);
  }
}

