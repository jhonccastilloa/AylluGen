import {
  HealthType,
  HealthRecord,
  HealthRecordCreateInput,
  HealthRecordUpdateInput,
  UpcomingHealthTask,
} from "../entities/HealthRecord";

export interface IHealthRecordRepository {
  findById(id: string): Promise<HealthRecord | null>;
  findAllByUserId(userId: string): Promise<HealthRecord[]>;
  findByAnimalId(animalId: string): Promise<HealthRecord[]>;
  findByType(userId: string, type: HealthType): Promise<HealthRecord[]>;
  findUpcoming(
    userId: string,
    daysAhead?: number,
  ): Promise<UpcomingHealthTask[]>;
  create(data: HealthRecordCreateInput): Promise<HealthRecord>;
  update(id: string, data: HealthRecordUpdateInput): Promise<HealthRecord>;
  delete(id: string): Promise<void>;
  findCompleted(userId: string): Promise<HealthRecord[]>;
  findPending(userId: string): Promise<HealthRecord[]>;
}
