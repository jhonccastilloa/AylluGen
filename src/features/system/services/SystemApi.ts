import { ApiService } from '@/infrastructure/api/ApiService';

interface HealthResponse {
  status?: string;
  message?: string;
}

export class SystemApi {
  getHealth(): Promise<HealthResponse> {
    return ApiService.get<HealthResponse>('/health', {
      skipAuth: true,
      noLoader: true,
      showErrorToast: false,
      timeoutMs: 5_000,
    });
  }

  getReady(): Promise<HealthResponse> {
    return ApiService.get<HealthResponse>('/ready', {
      skipAuth: true,
      noLoader: true,
      showErrorToast: false,
      timeoutMs: 5_000,
    });
  }

  getLive(): Promise<HealthResponse> {
    return ApiService.get<HealthResponse>('/live', {
      skipAuth: true,
      noLoader: true,
      showErrorToast: false,
      timeoutMs: 5_000,
    });
  }
}

const systemApi = new SystemApi();
export default systemApi;

