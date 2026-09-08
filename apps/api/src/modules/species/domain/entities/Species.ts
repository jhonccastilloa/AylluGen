export interface Species {
  id: string;
  code: string;
  name: string;
  description?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface SpeciesCreateInput {
  code: string;
  name: string;
  description?: string;
  userId: string;
}

export interface SpeciesUpdateInput {
  code?: string;
  name?: string;
  description?: string;
}

