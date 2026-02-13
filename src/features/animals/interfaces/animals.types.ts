import type {
  Sex,
  Species,
  SyncStatus,
} from '@/features/shared/interfaces/common.types';

export type { Sex, Species } from '@/features/shared/interfaces/common.types';

export interface Animal {
  id: string;
  crotal: string;
  sex: Sex;
  speciesId?: string | null;
  species: Species;
  speciesName?: string | null;
  birthDate: string | null;
  isFounder: boolean;
  fatherId: string | null;
  motherId: string | null;
  userId: string;
  syncStatus: SyncStatus;
  syncVersion: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface AnimalCreateInput {
  crotal: string;
  sex: Sex;
  speciesId?: string;
  speciesCode?: string;
  species: Species;
  birthDate?: string;
  isFounder?: boolean;
  fatherId?: string;
  motherId?: string;
}

export interface AnimalUpdateInput {
  crotal?: string;
  speciesId?: string;
  speciesCode?: string;
  birthDate?: string;
  isFounder?: boolean;
  fatherId?: string;
  motherId?: string;
}
