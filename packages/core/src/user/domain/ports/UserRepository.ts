import type { UserEntity } from "../entities/UserEntity";

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByDni(dni: string): Promise<UserEntity | null>;
}
