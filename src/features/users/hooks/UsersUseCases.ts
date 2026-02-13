import { UsersApi } from '@/features/users/services/UsersApi';
import type { UserProfile } from '@/features/users/interfaces/users.types';

export class UsersUseCases {
  constructor(private readonly api: UsersApi) {}

  getMe(): Promise<UserProfile> {
    return this.api.getMe();
  }

  getById(userId: string): Promise<UserProfile> {
    return this.api.getById(userId);
  }

  updatePassword(userId: string, password: string): Promise<UserProfile> {
    return this.api.update(userId, { password });
  }

  deleteUser(userId: string): Promise<void> {
    return this.api.delete(userId);
  }
}

