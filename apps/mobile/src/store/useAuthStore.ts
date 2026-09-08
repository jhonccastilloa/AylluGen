import { create } from 'zustand';
import authService from '@/application/services/AuthService';
import authSession from '@/infrastructure/auth/AuthSession';
import type { AuthResponse, AuthUser } from '@/application/services/AuthService.types';
import { extractApiErrorMessage } from '@/core/utils/apiErrorHandler';
import { useSyncStore } from '@/store/useSyncStore';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: AuthUser | null) => void;
  login: (dni: string, password: string) => Promise<void>;
  register: (dni: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  syncSession: () => void;
  clearError: () => void;
}

const getInitialState = () => {
  const session = authSession.getSession();
  const isAuthenticated = Boolean(
    session.accessToken && session.refreshToken && session.user,
  );

  return {
    user: session.user,
    isAuthenticated,
  };
};

const applySession = (set: (partial: Partial<AuthState>) => void, payload: AuthResponse) => {
  authSession.setSession(payload);
  set({
    user: payload.user,
    isAuthenticated: true,
    isLoading: false,
    error: null,
  });
};

const clearSession = (set: (partial: Partial<AuthState>) => void) => {
  authSession.clearSession();
  useSyncStore.getState().reset();
  set({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });
};

export const useAuthStore = create<AuthState>()(set => ({
  ...getInitialState(),
  isLoading: false,
  error: null,
  setUser: user => set({ user }),

  login: async (dni, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.login({ dni, password });
      applySession(set, response);
    } catch (error) {
      set({
        isLoading: false,
        error: extractApiErrorMessage(error),
      });
      throw error;
    }
  },

  register: async (dni, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.register({ dni, password });
      applySession(set, response);
    } catch (error) {
      set({
        isLoading: false,
        error: extractApiErrorMessage(error),
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    const refreshToken = authSession.getRefreshToken();

    try {
      if (refreshToken) {
        await authService.logout({ refreshToken });
      }
    } catch {
      // Always clear local session, even when server logout fails.
    } finally {
      clearSession(set);
    }
  },

  refreshSession: async () => {
    const refreshToken = authSession.getRefreshToken();
    if (!refreshToken) {
      clearSession(set);
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await authService.refreshToken({ refreshToken });
      applySession(set, response);
    } catch (error) {
      clearSession(set);
      set({
        error: extractApiErrorMessage(error),
      });
      throw error;
    }
  },

  syncSession: () => {
    const session = authSession.getSession();
    set({
      user: session.user,
      isAuthenticated: Boolean(
        session.accessToken && session.refreshToken && session.user,
      ),
      isLoading: false,
    });
  },

  clearError: () => set({ error: null }),
}));

authSession.subscribe(() => {
  useAuthStore.getState().syncSession();
});
