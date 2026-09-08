export interface RefreshToken {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface RefreshTokenCreateInput {
  token: string;
  userId: string;
  expiresAt: Date;
}
