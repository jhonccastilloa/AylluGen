import type {
  RiskLevel,
  SyncStatus,
} from '@/features/shared/interfaces/common.types';

export type { RiskLevel } from '@/features/shared/interfaces/common.types';

export interface Breeding {
  id: string;
  maleId: string;
  femaleId: string;
  projectedCOI: number;
  riskLevel: RiskLevel;
  offspringId: string | null;
  breedingDate: string | null;
  notes: string | null;
  userId: string;
  syncStatus: SyncStatus;
  syncVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface BreedingCreateInput {
  maleId: string;
  femaleId: string;
  projectedCOI: number;
  riskLevel: RiskLevel;
  breedingDate?: string;
  notes?: string;
}

export interface BreedingUpdateInput {
  breedingDate?: string;
  notes?: string;
  offspringId?: string;
}

export interface BreedingMatchInput {
  maleId: string;
  femaleId: string;
}

export interface CoiCalculationResponse {
  coi: number;
  riskLevel: RiskLevel;
  relationship: string;
  recommendation: string;
}
