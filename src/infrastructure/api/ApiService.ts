import api from '@/infrastructure/api/apiClient';
import { handleApiError } from '@/core/utils/apiErrorHandler';
import type { RequestConfig } from '@/core/types/api';
import { NetworkUnavailableError } from '@/core/errors/NetworkUnavailableError';
import { useNetworkStore } from '@/store/useNetworkStore';
import { AxiosError } from 'axios';

const buildRequestConfig = (config?: RequestConfig) => ({
  timeout: config?.timeoutMs,
  headers: {
    ...config?.headers,
    noLoader: config?.noLoader,
    'x-skip-auth': config?.skipAuth,
  },
});

const assertNetworkAvailability = (config?: RequestConfig) => {
  if (config?.skipNetworkCheck) return;

  const { isInitialized, isOnline } = useNetworkStore.getState();
  if (isInitialized && !isOnline) {
    throw new NetworkUnavailableError();
  }
};

const isTransportNetworkError = (error: unknown): boolean =>
  error instanceof AxiosError && Boolean(error.request) && !error.response;

export class ApiService {
  private static async execute<T>(
    request: () => Promise<T>,
    config?: RequestConfig,
  ): Promise<T> {
    try {
      assertNetworkAvailability(config);
      const data = await request();
      useNetworkStore.getState().markOnline();
      return data;
    } catch (error) {
      if (error instanceof NetworkUnavailableError || isTransportNetworkError(error)) {
        useNetworkStore.getState().markOffline();
      }
      handleApiError(error, config?.showErrorToast ?? false);
      throw error;
    }
  }

  static async get<T>(
    url: string,
    config?: RequestConfig,
  ): Promise<T> {
    return this.execute(async () => {
      const response = await api.get<T>(url, buildRequestConfig(config));
      return response.data;
    }, config);
  }

  static async post<T>(
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    return this.execute(async () => {
      const response = await api.post<T>(url, data, buildRequestConfig(config));
      return response.data;
    }, config);
  }

  static async put<T>(
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    return this.execute(async () => {
      const response = await api.put<T>(url, data, buildRequestConfig(config));
      return response.data;
    }, config);
  }

  static async patch<T>(
    url: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    return this.execute(async () => {
      const response = await api.patch<T>(url, data, buildRequestConfig(config));
      return response.data;
    }, config);
  }

  static async delete<T>(
    url: string,
    config?: RequestConfig,
  ): Promise<T> {
    return this.execute(async () => {
      const response = await api.delete<T>(url, buildRequestConfig(config));
      return response.data;
    }, config);
  }
}
