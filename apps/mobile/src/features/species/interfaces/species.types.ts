export interface ISpecies {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export type { ICreateSpecieInput as SpeciesCreateInput, IUpdateSpecieInput as SpeciesUpdateInput } from '@ayllugen/core/species/inputs';
