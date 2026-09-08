import { ProductionRecordService } from "../../../../src/modules/production/application/services/ProductionRecordService";
import { IProductionRecordRepository } from "../../../../src/modules/production/domain/repositories/IProductionRecordRepository";
import { IAnimalRepository } from "../../../../src/modules/animal/domain/repositories/IAnimalRepository";
import {
  ProductionRecord,
  ProductionType,
  SyncStatus,
} from "../../../../src/modules/production/domain/entities/ProductionRecord";
import {
  Animal,
  Sex,
} from "../../../../src/modules/animal/domain/entities/Animal";
import {
  NotFoundError,
  ValidationError,
} from "../../../../src/shared/errors/AppError";
import { TYPES } from "../../../../src/shared/di/types";
import { Container } from "inversify";

describe("ProductionRecordService", () => {
  let productionRecordService: ProductionRecordService;
  let productionRecordRepository: jest.Mocked<IProductionRecordRepository>;
  let animalRepository: jest.Mocked<IAnimalRepository>;
  let container: Container;

  const userId = "user-123";
  const animalId = "animal-123";
  const productionRecordId = "production-record-123";

  const mockAnimal: Animal = {
    id: animalId,
    crotal: "CR12345",
    sex: Sex.FEMALE,
    species: "SHEEP",
    speciesId: "species-sheep",
    birthDate: new Date("2024-01-01"),
    isFounder: false,
    userId,
    syncStatus: SyncStatus.SYNCED,
    syncVersion: 1,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  const mockProductionRecord: ProductionRecord = {
    id: productionRecordId,
    animalId,
    type: ProductionType.WOOL,
    date: new Date("2024-01-01"),
    value: 3.5,
    unit: "kg",
    qualityScore: 8,
    notes: "Good quality wool",
    userId,
    syncStatus: SyncStatus.SYNCED,
    syncVersion: 1,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  beforeEach(() => {
    container = new Container({ autobind: true });
    productionRecordRepository = {
      findById: jest.fn(),
      findAllByUserId: jest.fn(),
      findByAnimalId: jest.fn(),
      findByType: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findRecentByAnimal: jest.fn(),
      calculateSummary: jest.fn(),
    };

    animalRepository = {
      findById: jest.fn(),
      findByCrotal: jest.fn(),
      findAllByUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findPedigree: jest.fn(),
      findParents: jest.fn(),
      findChildren: jest.fn(),
      findBySpecies: jest.fn(),
      findBySex: jest.fn(),
      findFounders: jest.fn(),
    };

    container
      .bind<IProductionRecordRepository>(TYPES.IProductionRecordRepository)
      .toConstantValue(productionRecordRepository);
    container
      .bind<IAnimalRepository>(TYPES.IAnimalRepository)
      .toConstantValue(animalRepository);
    productionRecordService = container.get<ProductionRecordService>(
      ProductionRecordService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create production record successfully", async () => {
      animalRepository.findById.mockResolvedValue(mockAnimal);
      productionRecordRepository.create.mockResolvedValue(mockProductionRecord);

      const result = await productionRecordService.create(userId, {
        animalId,
        type: ProductionType.WOOL,
        date: "2024-01-01T00:00:00.000Z",
        value: 3.5,
        unit: "kg",
        qualityScore: 8,
        notes: "Good quality wool",
      });

      expect(result.id).toBe(productionRecordId);
      expect(result.type).toBe(ProductionType.WOOL);
      expect(animalRepository.findById).toHaveBeenCalledWith(animalId);
    });

    it("should throw NotFoundError when animal not found", async () => {
      animalRepository.findById.mockResolvedValue(null);

      await expect(
        productionRecordService.create(userId, {
          animalId,
          type: ProductionType.WOOL,
          date: "2024-01-01T00:00:00.000Z",
          value: 3.5,
          unit: "kg",
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when user does not own animal", async () => {
      const otherUserAnimal = { ...mockAnimal, userId: "other-user" };
      animalRepository.findById.mockResolvedValue(otherUserAnimal);

      await expect(
        productionRecordService.create(userId, {
          animalId,
          type: ProductionType.WOOL,
          date: "2024-01-01T00:00:00.000Z",
          value: 3.5,
          unit: "kg",
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getAll", () => {
    it("should get all production records for user", async () => {
      productionRecordRepository.findAllByUserId.mockResolvedValue([
        mockProductionRecord,
      ]);

      const result = await productionRecordService.getAll(userId);

      expect(result.records).toHaveLength(1);
      expect(result.records[0].id).toBe(productionRecordId);
    });

    it("should get production records by animal id", async () => {
      animalRepository.findById.mockResolvedValue(mockAnimal);
      productionRecordRepository.findByAnimalId.mockResolvedValue([
        mockProductionRecord,
      ]);

      const result = await productionRecordService.getAll(userId, animalId);

      expect(result.records).toHaveLength(1);
      expect(productionRecordRepository.findByAnimalId).toHaveBeenCalledWith(
        animalId,
      );
    });

    it("should get production records by type", async () => {
      productionRecordRepository.findByType.mockResolvedValue([
        mockProductionRecord,
      ]);

      const result = await productionRecordService.getAll(
        userId,
        undefined,
        ProductionType.WOOL,
      );

      expect(result.records).toHaveLength(1);
      expect(productionRecordRepository.findByType).toHaveBeenCalledWith(
        userId,
        ProductionType.WOOL,
      );
    });

    it("should throw ValidationError when user does not own animal", async () => {
      const otherUserAnimal = { ...mockAnimal, userId: "other-user" };
      animalRepository.findById.mockResolvedValue(otherUserAnimal);

      await expect(
        productionRecordService.getAll(userId, animalId),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getById", () => {
    it("should get production record by id successfully", async () => {
      productionRecordRepository.findById.mockResolvedValue(
        mockProductionRecord,
      );

      const result = await productionRecordService.getById(
        productionRecordId,
        userId,
      );

      expect(result.id).toBe(productionRecordId);
      expect(productionRecordRepository.findById).toHaveBeenCalledWith(
        productionRecordId,
      );
    });

    it("should throw NotFoundError when production record not found", async () => {
      productionRecordRepository.findById.mockResolvedValue(null);

      await expect(
        productionRecordService.getById(productionRecordId, userId),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when user does not own production record", async () => {
      const otherUserRecord = { ...mockProductionRecord, userId: "other-user" };
      productionRecordRepository.findById.mockResolvedValue(otherUserRecord);

      await expect(
        productionRecordService.getById(productionRecordId, userId),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getSummary", () => {
    it("should get production summary successfully", async () => {
      animalRepository.findById.mockResolvedValue(mockAnimal);
      const summary = {
        animalId,
        animalCrotal: "CR12345",
        type: ProductionType.WOOL,
        totalRecords: 10,
        averageValue: 3.5,
        averageQualityScore: 8,
        lastRecord: new Date("2024-01-01"),
        trend: "improving" as const,
      };
      productionRecordRepository.calculateSummary.mockResolvedValue(summary);

      const result = await productionRecordService.getSummary(
        animalId,
        userId,
        ProductionType.WOOL,
      );

      expect(result.animalId).toBe(animalId);
      expect(result.totalRecords).toBe(10);
      expect(productionRecordRepository.calculateSummary).toHaveBeenCalledWith(
        animalId,
        ProductionType.WOOL,
      );
    });

    it("should throw NotFoundError when animal not found", async () => {
      animalRepository.findById.mockResolvedValue(null);

      await expect(
        productionRecordService.getSummary(
          animalId,
          userId,
          ProductionType.WOOL,
        ),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when user does not own animal", async () => {
      const otherUserAnimal = { ...mockAnimal, userId: "other-user" };
      animalRepository.findById.mockResolvedValue(otherUserAnimal);

      await expect(
        productionRecordService.getSummary(
          animalId,
          userId,
          ProductionType.WOOL,
        ),
      ).rejects.toThrow(ValidationError);
    });

    it("should return empty summary when no records found", async () => {
      animalRepository.findById.mockResolvedValue(mockAnimal);
      productionRecordRepository.calculateSummary.mockResolvedValue(null);

      const result = await productionRecordService.getSummary(
        animalId,
        userId,
        ProductionType.WOOL,
      );

      expect(result).toEqual({
        animalId,
        animalCrotal: mockAnimal.crotal,
        type: ProductionType.WOOL,
        totalRecords: 0,
        averageValue: 0,
        averageQualityScore: null,
        lastRecord: "",
        trend: "stable",
      });
    });
  });

  describe("getRecent", () => {
    it("should get recent production records successfully", async () => {
      animalRepository.findById.mockResolvedValue(mockAnimal);
      productionRecordRepository.findRecentByAnimal.mockResolvedValue([
        mockProductionRecord,
      ]);

      const result = await productionRecordService.getRecent(
        animalId,
        userId,
        10,
      );

      expect(result.records).toHaveLength(1);
      expect(
        productionRecordRepository.findRecentByAnimal,
      ).toHaveBeenCalledWith(animalId, 10);
    });

    it("should throw ValidationError when user does not own animal", async () => {
      const otherUserAnimal = { ...mockAnimal, userId: "other-user" };
      animalRepository.findById.mockResolvedValue(otherUserAnimal);

      await expect(
        productionRecordService.getRecent(animalId, userId),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("update", () => {
    it("should update production record successfully", async () => {
      productionRecordRepository.findById.mockResolvedValue(
        mockProductionRecord,
      );
      productionRecordRepository.update.mockResolvedValue(mockProductionRecord);

      const result = await productionRecordService.update(
        productionRecordId,
        userId,
        {
          value: 4.0,
          notes: "Updated notes",
        },
      );

      expect(result.id).toBe(productionRecordId);
      expect(productionRecordRepository.update).toHaveBeenCalledWith(
        productionRecordId,
        {
          value: 4.0,
          notes: "Updated notes",
        },
      );
    });

    it("should throw NotFoundError when production record not found", async () => {
      productionRecordRepository.findById.mockResolvedValue(null);

      await expect(
        productionRecordService.update(productionRecordId, userId, {
          notes: "Updated notes",
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when user does not own production record", async () => {
      const otherUserRecord = { ...mockProductionRecord, userId: "other-user" };
      productionRecordRepository.findById.mockResolvedValue(otherUserRecord);

      await expect(
        productionRecordService.update(productionRecordId, userId, {
          notes: "Updated notes",
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("delete", () => {
    it("should delete production record successfully", async () => {
      productionRecordRepository.findById.mockResolvedValue(
        mockProductionRecord,
      );
      productionRecordRepository.delete.mockResolvedValue(undefined);

      await productionRecordService.delete(productionRecordId, userId);

      expect(productionRecordRepository.delete).toHaveBeenCalledWith(
        productionRecordId,
      );
    });

    it("should throw NotFoundError when production record not found", async () => {
      productionRecordRepository.findById.mockResolvedValue(null);

      await expect(
        productionRecordService.delete(productionRecordId, userId),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when user does not own production record", async () => {
      const otherUserRecord = { ...mockProductionRecord, userId: "other-user" };
      productionRecordRepository.findById.mockResolvedValue(otherUserRecord);

      await expect(
        productionRecordService.delete(productionRecordId, userId),
      ).rejects.toThrow(ValidationError);
    });
  });
});
