import { ApiService } from '@/infrastructure/api/ApiService';
import type { UserProfile } from '@/features/users/interfaces/users.types';

interface UpdateUserPayload {
  password?: string;
}

export class UsersApi {
  getMe(): Promise<UserProfile> {
    return ApiService.get<UserProfile>('/users/me');
  }

  getById(userId: string): Promise<UserProfile> {
    return ApiService.get<UserProfile>(`/users/${userId}`);
  }

  update(userId: string, payload: UpdateUserPayload): Promise<UserProfile> {
    return ApiService.put<UserProfile>(`/users/${userId}`, payload);
  }

  delete(userId: string): Promise<void> {
    return ApiService.delete<void>(`/users/${userId}`);
  }
}

