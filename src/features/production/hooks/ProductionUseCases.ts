import { ProductionLocalRepository } from '@/features/production/services/ProductionLocalRepository';
import type {
  ProductionRecord,
  ProductionRecordCreateInput,
  ProductionRecordUpdateInput,
  ProductionSummary,
  ProductionType,
} from '@/features/production/interfaces/production.types';

export class ProductionUseCases {
  constructor(private readonly localRepository: ProductionLocalRepository) {}

  async list(userId: string): Promise<ProductionRecord[]> {
    return this.localRepository.listByUserId(userId);
  }

  async create(
    userId: string,
    input: ProductionRecordCreateInput,
  ): Promise<ProductionRecord> {
    const localRecord = await this.localRepository.createLocal(userId, input);
    return localRecord;
  }

  async update(
    productionRecordId: string,
    input: ProductionRecordUpdateInput,
  ): Promise<ProductionRecord | null> {
    const updated = await this.localRepository.updateLocal(
      productionRecordId,
      input,
    );
    if (!updated) return null;

    return updated;
  }

  async delete(productionRecordId: string): Promise<boolean> {
    const deletedVersion =
      await this.localRepository.deleteLocal(productionRecordId);
    if (!deletedVersion) return false;

    return true;
  }

  async getById(id: string): Promise<ProductionRecord | null> {
    return this.localRepository.getById(id);
  }

  async getSummary(
    animalId: string,
    type: ProductionType,
  ): Promise<ProductionSummary> {
    const localRecords = await this.localRepository.listByAnimalAndType(
      animalId,
      type,
    );
    if (localRecords.length === 0) {
      return {
        animalId,
        animalCrotal: animalId,
        type,
        totalRecords: 0,
        averageValue: 0,
        averageQualityScore: null,
        lastRecord: '',
        trend: 'stable',
      };
    }

    const values = localRecords.map(record => record.value);
    const averageValue =
      values.reduce((sum, value) => sum + value, 0) / values.length;

    const qualityScores = localRecords
      .map(record => record.qualityScore)
      .filter((score): score is number => score !== null);
    const averageQualityScore =
      qualityScores.length > 0
        ? qualityScores.reduce((sum, value) => sum + value, 0) /
          qualityScores.length
        : null;

    const chronologicallySorted = [...localRecords].sort((left, right) =>
      left.date.localeCompare(right.date),
    );
    const firstValue = chronologicallySorted[0]?.value ?? averageValue;
    const lastValue =
      chronologicallySorted[chronologicallySorted.length - 1]?.value ??
      averageValue;
    const driftThreshold = Math.max(Math.abs(firstValue) * 0.03, 0.01);

    const trend: ProductionSummary['trend'] =
      Math.abs(lastValue - firstValue) <= driftThreshold
        ? 'stable'
        : lastValue > firstValue
          ? 'improving'
          : 'declining';

    return {
      animalId,
      animalCrotal: animalId,
      type,
      totalRecords: localRecords.length,
      averageValue,
      averageQualityScore,
      lastRecord: localRecords[0].date,
      trend,
    };
  }

  async getRecent(
    animalId: string,
    limit?: number,
  ): Promise<ProductionRecord[]> {
    const localRecords = await this.localRepository.listByAnimalId(animalId);
    return localRecords.slice(0, limit ?? 10);
  }
}
