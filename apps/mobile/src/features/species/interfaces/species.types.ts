export interface Species {
  id: string;
  code: string;
  name: string;
  description: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export type { CreateSpeciesInput as SpeciesCreateInput, UpdateSpeciesInput as SpeciesUpdateInput } from '@ayllugen/core/species/inputs';
