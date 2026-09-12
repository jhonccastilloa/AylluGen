export interface SpeciesFields {
  code: string;
  name: string;
  description: string | null;
}

export interface SpeciesProps extends SpeciesFields {
  id: string;
  userId: string;
}

/** Persistence projection. Origin timestamps are not server audit timestamps. */
export interface SpeciesData extends SpeciesProps {
  clientCreatedAt: Date;
  clientUpdatedAt: Date;
}
