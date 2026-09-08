export interface Species {
  id: string;
  code: string;
  name: string;
  description: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpeciesCreateInput {
  code: string;
  name: string;
  description?: string;
}

export interface SpeciesUpdateInput {
  code?: string;
  name?: string;
  description?: string;
}

