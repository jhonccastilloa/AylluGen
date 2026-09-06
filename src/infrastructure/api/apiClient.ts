import Axios, {
  AxiosHeaders,
  AxiosRequestHeaders,
  InternalAxiosRequestConfig,
} from 'axios';
import config from '@/core/config/env';
import logger from '@/infrastructure/logger';
import { useLoaderStore } from '@/store/useLoaderStore';
import authSession from '@/infrastructure/auth/AuthSession';
import type { AuthResponse } from '@/application/services/AuthService.types';

const api = Axios.create({
  baseURL: config.apiBaseUrl,
  timeout: config.apiTimeout,
});

let requestsCount = 0;

const showLoader = (noLoader: boolean = false) => {
  if (!noLoader && requestsCount === 0) {
    useLoaderStore.getState().showLoader();
  }
  if (!noLoader) requestsCount++;
};

const hideLoader = (noLoader: boolean = false) => {
  if (!noLoader) {
    requestsCount = Math.max(0, requestsCount - 1);
    if (requestsCount === 0) {
      useLoaderStore.getState().hideLoader();
    }
  }
};

const readHeader = (
  headers: AxiosRequestHeaders | AxiosHeaders,
  key: string,
) => {
  const value =
    headers instanceof AxiosHeaders ? headers.get(key) : headers[key];
  if (typeof value === 'boolean') return value;
  return value === 'true';
};

const ensureHeaders = (requestConfig: InternalAxiosRequestConfig) => {
  if (!requestConfig.headers) {
    requestConfig.headers = new AxiosHeaders();
  }
  return requestConfig.headers;
};

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const originalUserId = authSession.getUser()?.id;
    const refreshToken = authSession.getRefreshToken();
    if (!refreshToken) {
      authSession.clearSession();
      return null;
    }

    try {
      const response = await api.post<AuthResponse>(
        '/auth/refresh',
        { refreshToken },
        {
          headers: {
            noLoader: true,
            'x-skip-auth': true,
          },
        },
      );
      if (
        authSession.getUser()?.id !== originalUserId ||
        authSession.getRefreshToken() !== refreshToken
      )
        return null;
      authSession.setSession(response.data);
      return response.data.accessToken;
    } catch (error) {
      const rejected =
        Axios.isAxiosError(error) &&
        (error.response?.status === 401 || error.response?.status === 403);
      if (!rejected) throw error; // keep the offline session on transport/server failures
      if (
        authSession.getUser()?.id === originalUserId &&
        authSession.getRefreshToken() === refreshToken
      )
        authSession.clearSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

api.interceptors.request.use(
  async requestConfig => {
    const headers = ensureHeaders(requestConfig);
    const noLoader = readHeader(headers, 'noLoader');
    const skipAuth = readHeader(headers, 'x-skip-auth');

    const expectedAccount = headers.get('x-local-account');
    if (expectedAccount && expectedAccount !== authSession.getUser()?.id) {
      throw new Error('La cuenta cambió antes de enviar la petición.');
    }

    if (!skipAuth) {
      const accessToken = authSession.getAccessToken();
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
    }

    if (config.enableLogging) {
      logger.debug('API Request', {
        url: `${config.apiBaseUrl}${requestConfig?.url}`,
        method: requestConfig.method?.toUpperCase(),
      });
    }
    showLoader(noLoader);
    return requestConfig;
  },
  error => {
    const noLoader = error.config?.headers
      ? readHeader(error.config.headers, 'noLoader')
      : false;
    hideLoader(noLoader);
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  response => {
    const noLoader = response.config?.headers
      ? readHeader(response.config.headers, 'noLoader')
      : false;
    hideLoader(noLoader);
    if (config.enableLogging) {
      logger.debug('API Response', {
        url: `${config.apiBaseUrl}${response.config?.url}`,
        status: response.status,
      });
    }
    return response;
  },
  async error => {
    const noLoader = error.config?.headers
      ? readHeader(error.config.headers, 'noLoader')
      : false;
    hideLoader(noLoader);

    if (config.enableLogging) {
      logger.error('API Error', {
        url: error.config?.url
          ? `${config.apiBaseUrl}${error.config.url}`
          : 'unknown',
        status: error.response?.status,
      });
    }

    const requestConfig = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (!requestConfig) {
      return Promise.reject(error);
    }

    const headers = ensureHeaders(requestConfig);
    const skipAuth = readHeader(headers, 'x-skip-auth');

    const shouldTryRefresh =
      error.response?.status === 401 &&
      !requestConfig._retry &&
      !skipAuth &&
      !requestConfig.url?.includes('/auth/refresh');

    if (!shouldTryRefresh) {
      return Promise.reject(error);
    }

    requestConfig._retry = true;
    const newAccessToken = await refreshAccessToken();

    if (!newAccessToken) {
      return Promise.reject(error);
    }

    headers.set('Authorization', `Bearer ${newAccessToken}`);
    return api(requestConfig);
  },
);

export default api;
