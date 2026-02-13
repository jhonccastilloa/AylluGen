import type {
  HealthType,
  SyncStatus,
} from '@/features/shared/interfaces/common.types';

export type { HealthType } from '@/features/shared/interfaces/common.types';

export interface HealthRecord {
  id: string;
  animalId: string;
  type: HealthType;
  date: string;
  notes: string | null;
  nextDueDate: string | null;
  completed: boolean;
  userId: string;
  syncStatus: SyncStatus;
  syncVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface HealthRecordCreateInput {
  animalId: string;
  type: HealthType;
  date: string;
  notes?: string;
  nextDueDate?: string;
  completed?: boolean;
}

export interface HealthRecordUpdateInput {
  type?: HealthType;
  date?: string;
  notes?: string;
  nextDueDate?: string;
  completed?: boolean;
}
