export enum Sex {
  MALE = "MALE",
  FEMALE = "FEMALE",
}

export type SpeciesCode = string;

export enum SyncStatus {
  SYNCED = "SYNCED",
  PENDING = "PENDING",
  CONFLICT = "CONFLICT",
  DELETED = "DELETED",
}

export interface Animal {
  id: string;
  crotal: string;
  sex: Sex;
  speciesId: string;
  species: SpeciesCode;
  speciesName?: string;
  birthDate?: Date;
  isFounder: boolean;
  fatherId?: string;
  motherId?: string;
  father?: Animal;
  mother?: Animal;
  children?: Animal[];
  userId: string;
  syncStatus: SyncStatus;
  syncVersion: number;
  clientCreatedAt?: Date;
  clientUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface AnimalCreateDTO {
  crotal: string;
  sex: Sex;
  speciesId: string;
  birthDate?: Date;
  isFounder: boolean;
  fatherId?: string;
  motherId?: string;
  userId: string;
}

export interface AnimalUpdateDTO {
  crotal?: string;
  speciesId?: string;
  birthDate?: Date;
  isFounder?: boolean;
  fatherId?: string;
  motherId?: string;
}
