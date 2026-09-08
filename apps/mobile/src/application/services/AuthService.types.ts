export interface AuthUser {
  id: string;
  dni: string;
  createdAt?: string;
  updatedAt?: string;
  email?: string;
  name?: string;
  role?: string;
}

export interface LoginCredentials {
  dni: string;
  password: string;
}

export interface RegisterCredentials {
  dni: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface LogoutInput {
  refreshToken: string;
}
