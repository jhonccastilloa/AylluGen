import { Animal } from "../../../animal/domain/entities/Animal";

export enum HealthType {
  VACCINATION = "VACCINATION",
  DEWORMING = "DEWORMING",
  SHEARING = "SHEARING",
  CHECKUP = "CHECKUP",
  TREATMENT = "TREATMENT",
}

export enum SyncStatus {
  SYNCED = "SYNCED",
  PENDING = "PENDING",
  CONFLICT = "CONFLICT",
  DELETED = "DELETED",
}

export interface HealthRecord {
  id: string;
  animalId: string;
  animal?: Animal;
  type: HealthType;
  date: Date;
  notes?: string;
  nextDueDate?: Date;
  completed: boolean;
  userId: string;
  syncStatus: SyncStatus;
  syncVersion: number;
  clientCreatedAt?: Date;
  clientUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthRecordCreateInput {
  animalId: string;
  type: HealthType;
  date: Date;
  notes?: string;
  nextDueDate?: Date;
  completed?: boolean;
  userId: string;
}

export interface HealthRecordUpdateInput {
  type?: HealthType;
  date?: Date;
  notes?: string;
  nextDueDate?: Date;
  completed?: boolean;
}

export interface UpcomingHealthTask {
  id: string;
  animalId: string;
  animalCrotal: string;
  type: HealthType;
  dueDate: Date;
  daysUntilDue: number;
  notes?: string;
}
