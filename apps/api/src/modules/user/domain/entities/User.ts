export interface User {
  id: string;
  dni: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreateInput {
  dni: string;
  password: string;
}

export interface UserUpdateInput {
  password?: string;
}
