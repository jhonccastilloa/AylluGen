import type {
  ProductionType,
  SyncStatus,
} from '@/features/shared/interfaces/common.types';

export type { ProductionType } from '@/features/shared/interfaces/common.types';

export interface ProductionRecord {
  id: string;
  animalId: string;
  type: ProductionType;
  date: string;
  value: number;
  unit: string;
  qualityScore: number | null;
  notes: string | null;
  userId: string;
  syncStatus: SyncStatus;
  syncVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionRecordCreateInput {
  animalId: string;
  type: ProductionType;
  date: string;
  value: number;
  unit: string;
  qualityScore?: number;
  notes?: string;
}

export interface ProductionRecordUpdateInput {
  type?: ProductionType;
  date?: string;
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
  averageQualityScore: number | null;
  lastRecord: string;
  trend: 'improving' | 'stable' | 'declining';
}
