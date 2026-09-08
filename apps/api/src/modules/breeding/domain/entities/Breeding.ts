import { Animal } from "../../../animal/domain/entities/Animal";

export enum RiskLevel {
  GREEN = "GREEN",
  YELLOW = "YELLOW",
  RED = "RED",
}

export enum SyncStatus {
  SYNCED = "SYNCED",
  PENDING = "PENDING",
  CONFLICT = "CONFLICT",
  DELETED = "DELETED",
}

export interface Breeding {
  id: string;
  maleId: string;
  femaleId: string;
  projectedCOI: number;
  riskLevel: RiskLevel;
  offspringId?: string;
  offspring?: Animal;
  breedingDate?: Date;
  notes?: string;
  userId: string;
  syncStatus: SyncStatus;
  syncVersion: number;
  clientCreatedAt?: Date;
  clientUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BreedingCreateInput {
  maleId: string;
  femaleId: string;
  projectedCOI: number;
  riskLevel: RiskLevel;
  offspringId?: string;
  breedingDate?: Date;
  notes?: string;
  userId: string;
}

export interface BreedingUpdateInput {
  breedingDate?: Date;
  notes?: string;
  offspringId?: string;
}

export interface COICalculationResult {
  coi: number;
  riskLevel: RiskLevel;
  relationship: string;
}
