jest.mock('@/infrastructure/auth/AuthSession', () => ({
  __esModule: true,
  default: {
    getUser: jest.fn(),
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
    setSession: jest.fn(),
    clearSession: jest.fn(),
  },
}));
jest.mock('@/core/config/env', () => ({
  __esModule: true,
  default: {
    apiBaseUrl: 'https://test.invalid/api',
    apiTimeout: 1000,
    enableLogging: false,
  },
}));
jest.mock('@/infrastructure/logger', () => ({
  __esModule: true,
  default: { debug: jest.fn(), error: jest.fn() },
}));

import {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from 'axios';
import api from './apiClient';
import authSession from '@/infrastructure/auth/AuthSession';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const rejected = (config: InternalAxiosRequestConfig, status: number) =>
  new AxiosError(
    'request failed',
    'ERR_BAD_RESPONSE',
    config,
    {},
    {
      status,
      statusText: 'error',
      headers: new AxiosHeaders(),
      data: {},
      config,
    },
  );
const ok = (config: InternalAxiosRequestConfig, data: unknown) => ({
  status: 200,
  statusText: 'ok',
  headers: new AxiosHeaders(),
  data,
  config,
});
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(authSession.getUser)
    .mockReturnValue({ id: owner } as ReturnType<typeof authSession.getUser>);
  jest.mocked(authSession.getAccessToken).mockReturnValue('access-A');
  jest.mocked(authSession.getRefreshToken).mockReturnValue('refresh-A');
});
it('blocks a queued sync before dispatch if its account no longer matches', async () => {
  const adapter = jest.fn(async c => ok(c, {}));
  api.defaults.adapter = adapter;
  await expect(
    api.post(
      '/sync/v2/push',
      {},
      { headers: { 'x-local-account': other, noLoader: true } },
    ),
  ).rejects.toThrow(/cuenta/);
  expect(adapter).not.toHaveBeenCalled();
});
it('uses the authenticated bearer token without logging sync bodies', async () => {
  const adapter = jest.fn(async c => ok(c, {}));
  api.defaults.adapter = adapter;
  await api.post(
    '/sync/v2/pull',
    {},
    { headers: { 'x-local-account': owner, noLoader: true } },
  );
  expect(adapter.mock.calls[0][0].headers.get('Authorization')).toBe(
    'Bearer access-A',
  );
});
it('never restores an old account after a late refresh response', async () => {
  api.defaults.adapter = async config => {
    if (config.url === '/auth/refresh') {
      jest
        .mocked(authSession.getUser)
        .mockReturnValue({ id: other } as ReturnType<
          typeof authSession.getUser
        >);
      jest.mocked(authSession.getRefreshToken).mockReturnValue('refresh-B');
      return ok(config, {
        accessToken: 'new-A',
        refreshToken: 'next-A',
        user: { id: owner },
      });
    }
    throw rejected(config, 401);
  };
  await expect(
    api.post(
      '/sync/v2/push',
      {},
      { headers: { 'x-local-account': owner, noLoader: true } },
    ),
  ).rejects.toBeDefined();
  expect(authSession.setSession).not.toHaveBeenCalled();
  expect(authSession.clearSession).not.toHaveBeenCalled();
});
it('keeps the local session on a transient refresh failure so offline work remains accessible', async () => {
  api.defaults.adapter = async config => {
    throw rejected(config, config.url === '/auth/refresh' ? 503 : 401);
  };
  await expect(
    api.post(
      '/sync/v2/pull',
      {},
      { headers: { 'x-local-account': owner, noLoader: true } },
    ),
  ).rejects.toMatchObject({ response: { status: 503 } });
  expect(authSession.clearSession).not.toHaveBeenCalled();
});
it('clears the session only when the same account refresh is rejected', async () => {
  api.defaults.adapter = async config => {
    throw rejected(config, 401);
  };
  await expect(
    api.post(
      '/sync/v2/pull',
      {},
      { headers: { 'x-local-account': owner, noLoader: true } },
    ),
  ).rejects.toBeDefined();
  expect(authSession.clearSession).toHaveBeenCalledTimes(1);
});
