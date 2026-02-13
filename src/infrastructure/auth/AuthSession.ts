import { createMMKV } from 'react-native-mmkv';
import type { AuthResponse, AuthUser } from '@/application/services/AuthService.types';

const storage = createMMKV({ id: 'auth-storage' });

const ACCESS_TOKEN_KEY = 'auth.accessToken';
const REFRESH_TOKEN_KEY = 'auth.refreshToken';
const USER_KEY = 'auth.user';

export interface AuthSessionState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
}

type SessionListener = (session: AuthSessionState) => void;

class AuthSession {
  private listeners = new Set<SessionListener>();

  getAccessToken(): string | null {
    return storage.getString(ACCESS_TOKEN_KEY) ?? null;
  }

  getRefreshToken(): string | null {
    return storage.getString(REFRESH_TOKEN_KEY) ?? null;
  }

  getUser(): AuthUser | null {
    const raw = storage.getString(USER_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  getSession(): AuthSessionState {
    return {
      accessToken: this.getAccessToken(),
      refreshToken: this.getRefreshToken(),
      user: this.getUser(),
    };
  }

  setSession(payload: AuthResponse): void {
    storage.set(ACCESS_TOKEN_KEY, payload.accessToken);
    storage.set(REFRESH_TOKEN_KEY, payload.refreshToken);
    storage.set(USER_KEY, JSON.stringify(payload.user));
    this.emit();
  }

  clearSession(): void {
    storage.remove(ACCESS_TOKEN_KEY);
    storage.remove(REFRESH_TOKEN_KEY);
    storage.remove(USER_KEY);
    this.emit();
  }

  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snapshot = this.getSession();
    this.listeners.forEach(listener => listener(snapshot));
  }
}

const authSession = new AuthSession();
export default authSession;
