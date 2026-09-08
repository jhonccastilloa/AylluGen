import {
  ProductionType,
  ProductionRecord,
  ProductionRecordCreateInput,
  ProductionRecordUpdateInput,
  ProductionSummary,
} from "../entities/ProductionRecord";

export interface IProductionRecordRepository {
  findById(id: string): Promise<ProductionRecord | null>;
  findAllByUserId(userId: string): Promise<ProductionRecord[]>;
  findByAnimalId(animalId: string): Promise<ProductionRecord[]>;
  findByType(userId: string, type: ProductionType): Promise<ProductionRecord[]>;
  create(data: ProductionRecordCreateInput): Promise<ProductionRecord>;
  update(
    id: string,
    data: ProductionRecordUpdateInput,
  ): Promise<ProductionRecord>;
  delete(id: string): Promise<void>;
  findRecentByAnimal(
    animalId: string,
    limit: number,
  ): Promise<ProductionRecord[]>;
  calculateSummary(
    animalId: string,
    type: ProductionType,
  ): Promise<ProductionSummary | null>;
}
