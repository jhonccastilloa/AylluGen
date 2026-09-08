import { HealthRecordService } from "../../../../src/modules/health/application/services/HealthRecordService";
import { IHealthRecordRepository } from "../../../../src/modules/health/domain/repositories/IHealthRecordRepository";
import { IAnimalRepository } from "../../../../src/modules/animal/domain/repositories/IAnimalRepository";
import {
  HealthRecord,
  HealthType,
  SyncStatus,
} from "../../../../src/modules/health/domain/entities/HealthRecord";
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

describe("HealthRecordService", () => {
  let healthRecordService: HealthRecordService;
  let healthRecordRepository: jest.Mocked<IHealthRecordRepository>;
  let animalRepository: jest.Mocked<IAnimalRepository>;
  let container: Container;

  const userId = "user-123";
  const animalId = "animal-123";
  const healthRecordId = "health-record-123";

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

  const mockHealthRecord: HealthRecord = {
    id: healthRecordId,
    animalId,
    type: HealthType.VACCINATION,
    date: new Date("2024-01-01"),
    notes: "Annual vaccination",
    nextDueDate: new Date("2025-01-01"),
    completed: true,
    userId,
    syncStatus: SyncStatus.SYNCED,
    syncVersion: 1,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  beforeEach(() => {
    container = new Container({ autobind: true });
    healthRecordRepository = {
      findById: jest.fn(),
      findAllByUserId: jest.fn(),
      findByAnimalId: jest.fn(),
      findByType: jest.fn(),
      findUpcoming: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findCompleted: jest.fn(),
      findPending: jest.fn(),
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
      .bind<IHealthRecordRepository>(TYPES.IHealthRecordRepository)
      .toConstantValue(healthRecordRepository);
    container
      .bind<IAnimalRepository>(TYPES.IAnimalRepository)
      .toConstantValue(animalRepository);
    healthRecordService =
      container.get<HealthRecordService>(HealthRecordService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create health record successfully", async () => {
      animalRepository.findById.mockResolvedValue(mockAnimal);
      healthRecordRepository.create.mockResolvedValue(mockHealthRecord);

      const result = await healthRecordService.create(userId, {
        animalId,
        type: HealthType.VACCINATION,
        date: "2024-01-01T00:00:00.000Z",
        notes: "Annual vaccination",
        nextDueDate: "2025-01-01T00:00:00.000Z",
        completed: true,
      });

      expect(result.id).toBe(healthRecordId);
      expect(result.type).toBe(HealthType.VACCINATION);
      expect(animalRepository.findById).toHaveBeenCalledWith(animalId);
    });

    it("should throw NotFoundError when animal not found", async () => {
      animalRepository.findById.mockResolvedValue(null);

      await expect(
        healthRecordService.create(userId, {
          animalId,
          type: HealthType.VACCINATION,
          date: "2024-01-01T00:00:00.000Z",
          completed: true,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when user does not own animal", async () => {
      const otherUserAnimal = { ...mockAnimal, userId: "other-user" };
      animalRepository.findById.mockResolvedValue(otherUserAnimal);

      await expect(
        healthRecordService.create(userId, {
          animalId,
          type: HealthType.VACCINATION,
          date: "2024-01-01T00:00:00.000Z",
          completed: true,
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("update", () => {
    it("should update health record successfully", async () => {
      healthRecordRepository.findById.mockResolvedValue(mockHealthRecord);
      healthRecordRepository.update.mockResolvedValue(mockHealthRecord);

      const result = await healthRecordService.update(healthRecordId, userId, {
        notes: "Updated notes",
        completed: true,
      });

      expect(result.id).toBe(healthRecordId);
      expect(healthRecordRepository.update).toHaveBeenCalledWith(
        healthRecordId,
        {
          notes: "Updated notes",
          completed: true,
        },
      );
    });

    it("should throw NotFoundError when health record not found", async () => {
      healthRecordRepository.findById.mockResolvedValue(null);

      await expect(
        healthRecordService.update(healthRecordId, userId, {
          notes: "Updated notes",
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when user does not own health record", async () => {
      const otherUserRecord = { ...mockHealthRecord, userId: "other-user" };
      healthRecordRepository.findById.mockResolvedValue(otherUserRecord);

      await expect(
        healthRecordService.update(healthRecordId, userId, {
          notes: "Updated notes",
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("delete", () => {
    it("should delete health record successfully", async () => {
      healthRecordRepository.findById.mockResolvedValue(mockHealthRecord);
      healthRecordRepository.delete.mockResolvedValue(undefined);

      await healthRecordService.delete(healthRecordId, userId);

      expect(healthRecordRepository.delete).toHaveBeenCalledWith(
        healthRecordId,
      );
    });

    it("should throw NotFoundError when health record not found", async () => {
      healthRecordRepository.findById.mockResolvedValue(null);

      await expect(
        healthRecordService.delete(healthRecordId, userId),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when user does not own health record", async () => {
      const otherUserRecord = { ...mockHealthRecord, userId: "other-user" };
      healthRecordRepository.findById.mockResolvedValue(otherUserRecord);

      await expect(
        healthRecordService.delete(healthRecordId, userId),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getById", () => {
    it("should get health record by id successfully", async () => {
      healthRecordRepository.findById.mockResolvedValue(mockHealthRecord);

      const result = await healthRecordService.getById(healthRecordId, userId);

      expect(result.id).toBe(healthRecordId);
      expect(healthRecordRepository.findById).toHaveBeenCalledWith(
        healthRecordId,
      );
    });

    it("should throw NotFoundError when health record not found", async () => {
      healthRecordRepository.findById.mockResolvedValue(null);

      await expect(
        healthRecordService.getById(healthRecordId, userId),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when user does not own health record", async () => {
      const otherUserRecord = { ...mockHealthRecord, userId: "other-user" };
      healthRecordRepository.findById.mockResolvedValue(otherUserRecord);

      await expect(
        healthRecordService.getById(healthRecordId, userId),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getAll", () => {
    it("should get all health records for user", async () => {
      healthRecordRepository.findAllByUserId.mockResolvedValue([
        mockHealthRecord,
      ]);

      const result = await healthRecordService.getAll(userId);

      expect(result.records).toHaveLength(1);
      expect(result.records[0].id).toBe(healthRecordId);
    });

    it("should get health records by animal id", async () => {
      animalRepository.findById.mockResolvedValue(mockAnimal);
      healthRecordRepository.findByAnimalId.mockResolvedValue([
        mockHealthRecord,
      ]);

      const result = await healthRecordService.getAll(userId, animalId);

      expect(result.records).toHaveLength(1);
      expect(healthRecordRepository.findByAnimalId).toHaveBeenCalledWith(
        animalId,
      );
    });

    it("should get health records by type", async () => {
      healthRecordRepository.findByType.mockResolvedValue([mockHealthRecord]);

      const result = await healthRecordService.getAll(
        userId,
        undefined,
        HealthType.VACCINATION,
      );

      expect(result.records).toHaveLength(1);
      expect(healthRecordRepository.findByType).toHaveBeenCalledWith(
        userId,
        HealthType.VACCINATION,
      );
    });

    it("should get completed health records", async () => {
      healthRecordRepository.findCompleted.mockResolvedValue([
        mockHealthRecord,
      ]);

      const result = await healthRecordService.getAll(
        userId,
        undefined,
        undefined,
        true,
      );

      expect(result.records).toHaveLength(1);
      expect(healthRecordRepository.findCompleted).toHaveBeenCalledWith(userId);
    });

    it("should get pending health records", async () => {
      healthRecordRepository.findPending.mockResolvedValue([mockHealthRecord]);

      const result = await healthRecordService.getAll(
        userId,
        undefined,
        undefined,
        false,
      );

      expect(result.records).toHaveLength(1);
      expect(healthRecordRepository.findPending).toHaveBeenCalledWith(userId);
    });

    it("should throw ValidationError when user does not own animal", async () => {
      const otherUserAnimal = { ...mockAnimal, userId: "other-user" };
      animalRepository.findById.mockResolvedValue(otherUserAnimal);

      await expect(
        healthRecordService.getAll(userId, animalId),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getUpcomingTasks", () => {
    it("should get upcoming health tasks successfully", async () => {
      const upcomingTask = {
        id: healthRecordId,
        animalId,
        animalCrotal: "CR12345",
        type: HealthType.VACCINATION,
        dueDate: new Date("2024-12-01"),
        daysUntilDue: 5,
        notes: "Due in 5 days",
      };
      healthRecordRepository.findUpcoming.mockResolvedValue([upcomingTask]);

      const result = await healthRecordService.getUpcomingTasks(userId, 7);

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].id).toBe(healthRecordId);
      expect(healthRecordRepository.findUpcoming).toHaveBeenCalledWith(
        userId,
        7,
      );
    });
  });
});
