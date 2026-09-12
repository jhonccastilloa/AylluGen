export interface CreateSpeciesInput {
  code: string;
  name: string;
  description?: string | null;
}
export type UpdateSpeciesInput = Partial<CreateSpeciesInput>;
