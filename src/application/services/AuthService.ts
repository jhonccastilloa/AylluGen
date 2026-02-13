import { ApiService } from '@/infrastructure/api/ApiService';
import type {
  AuthResponse,
  LoginCredentials,
  LogoutInput,
  RefreshTokenInput,
  RegisterCredentials,
} from '@/application/services/AuthService.types';

class AuthService {
  register(credentials: RegisterCredentials): Promise<AuthResponse> {
    return ApiService.post<AuthResponse>('/auth/register', credentials);
  }

  login(credentials: LoginCredentials): Promise<AuthResponse> {
    return ApiService.post<AuthResponse>('/auth/login', credentials);
  }

  refreshToken(input: RefreshTokenInput): Promise<AuthResponse> {
    return ApiService.post<AuthResponse>('/auth/refresh', input, {
      noLoader: true,
      skipAuth: true,
    });
  }

  logout(input: LogoutInput): Promise<void> {
    return ApiService.post<void>('/auth/logout', input, {
      noLoader: true,
    });
  }
}

const authService = new AuthService();
export default authService;
