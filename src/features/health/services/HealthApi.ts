import { ApiService } from '@/infrastructure/api/ApiService';
import type {
  HealthRecord,
  HealthRecordCreateInput,
  HealthRecordUpdateInput,
  HealthType,
} from '@/features/health/interfaces/health.types';

interface HealthListResponse {
  records: HealthRecord[];
}

interface HealthUpcomingTask {
  id: string;
  animalId: string;
  animalCrotal: string;
  type: HealthType;
  dueDate: string;
  daysUntilDue: number;
  notes: string | null;
}

interface HealthUpcomingResponse {
  tasks: HealthUpcomingTask[];
}

interface HealthFilters {
  animalId?: string;
  type?: HealthType;
  completed?: boolean;
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

export class HealthApi {
  create(input: HealthRecordCreateInput): Promise<HealthRecord> {
    return ApiService.post<HealthRecord>('/sanity', input);
  }

  getAll(filters?: HealthFilters): Promise<HealthListResponse> {
    return ApiService.get<HealthListResponse>(`/sanity${buildQuery(filters as Record<string, unknown> | undefined)}`);
  }

  getUpcoming(daysAhead?: number): Promise<HealthUpcomingResponse> {
    return ApiService.get<HealthUpcomingResponse>(
      `/sanity/upcoming${buildQuery({ daysAhead })}`,
    );
  }

  getById(id: string): Promise<HealthRecord> {
    return ApiService.get<HealthRecord>(`/sanity/${id}`);
  }

  update(id: string, input: HealthRecordUpdateInput): Promise<HealthRecord> {
    return ApiService.put<HealthRecord>(`/sanity/${id}`, input);
  }

  delete(id: string): Promise<void> {
    return ApiService.delete<void>(`/sanity/${id}`);
  }
}

