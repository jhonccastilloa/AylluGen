export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type RequestConfig = {
  noLoader?: boolean;
  skipAuth?: boolean;
  skipNetworkCheck?: boolean;
  showErrorToast?: boolean;
  timeoutMs?: number;
  headers?: Record<string, string>;
};
