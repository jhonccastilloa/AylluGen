import { Animal } from "../../../animal/domain/entities/Animal";

export enum ProductionType {
  WEIGHT = "WEIGHT",
  WOOL = "WOOL",
  FIBER = "FIBER",
  MEAT = "MEAT",
  MILK = "MILK",
}

export enum SyncStatus {
  SYNCED = "SYNCED",
  PENDING = "PENDING",
  CONFLICT = "CONFLICT",
  DELETED = "DELETED",
}

export interface ProductionRecord {
  id: string;
  animalId: string;
  animal?: Animal;
  type: ProductionType;
  date: Date;
  value: number;
  unit: string;
  qualityScore?: number;
  notes?: string;
  userId: string;
  syncStatus: SyncStatus;
  syncVersion: number;
  clientCreatedAt?: Date;
  clientUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductionRecordCreateInput {
  animalId: string;
  type: ProductionType;
  date: Date;
  value: number;
  unit: string;
  qualityScore?: number;
  notes?: string;
  userId: string;
}

export interface ProductionRecordUpdateInput {
  type?: ProductionType;
  date?: Date;
  value?: number;
  unit?: string;
  qualityScore?: number;
  notes?: string;
}

export interface ProductionSummary {
  animalId: string;
  animalCrotal: string;
  type: ProductionType;
  totalRecords: number;
  averageValue: number;
  averageQualityScore?: number|null;
  lastRecord: Date;
  trend: "improving" | "stable" | "declining";
}
