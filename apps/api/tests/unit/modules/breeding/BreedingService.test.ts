import { BreedingService } from "../../../../src/modules/breeding/application/services/BreedingService";
import { IBreedingRepository } from "../../../../src/modules/breeding/domain/repositories/IBreedingRepository";
import { IAnimalRepository } from "../../../../src/modules/animal/domain/repositories/IAnimalRepository";
import {
  Breeding,
  RiskLevel,
  SyncStatus,
} from "../../../../src/modules/breeding/domain/entities/Breeding";
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

describe("BreedingService", () => {
  let breedingService: BreedingService;
  let breedingRepository: jest.Mocked<IBreedingRepository>;
  let animalRepository: jest.Mocked<IAnimalRepository>;
  let container: Container;

  const userId = "user-123";
  const breedingId = "breeding-123";
  const maleId = "male-123";
  const femaleId = "female-123";

  const mockMale: Animal = {
    id: maleId,
    crotal: "CR001",
    sex: Sex.MALE,
    species: "SHEEP",
    speciesId: "species-sheep",
    birthDate: new Date("2023-01-01"),
    isFounder: true,
    userId,
    syncStatus: SyncStatus.SYNCED,
    syncVersion: 1,
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-01"),
  };

  const mockFemale: Animal = {
    id: femaleId,
    crotal: "CR002",
    sex: Sex.FEMALE,
    species: "SHEEP",
    speciesId: "species-sheep",
    birthDate: new Date("2023-01-01"),
    isFounder: true,
    userId,
    syncStatus: SyncStatus.SYNCED,
    syncVersion: 1,
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-01"),
  };

  const mockBreeding: Breeding = {
    id: breedingId,
    maleId,
    femaleId,
    projectedCOI: 0.03125,
    riskLevel: RiskLevel.GREEN,
    breedingDate: new Date("2024-01-01"),
    notes: "Good match",
    userId,
    syncStatus: SyncStatus.SYNCED,
    syncVersion: 1,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  beforeEach(() => {
    container = new Container({ autobind: true });
    breedingRepository = {
      findById: jest.fn(),
      findByParents: jest.fn(),
      findAllByUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findBreedingHistory: jest.fn(),
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
      .bind<IBreedingRepository>(TYPES.IBreedingRepository)
      .toConstantValue(breedingRepository);
    container
      .bind<IAnimalRepository>(TYPES.IAnimalRepository)
      .toConstantValue(animalRepository);
    breedingService = container.get<BreedingService>(BreedingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("calculateCOI", () => {
    it("should calculate COI successfully", async () => {
      animalRepository.findById.mockResolvedValueOnce(mockMale as any);
      animalRepository.findById.mockResolvedValueOnce(mockFemale as any);

      const result = await breedingService.calculateCOI(userId, {
        maleId,
        femaleId,
      });

      expect(result).toHaveProperty("coi");
      expect(result).toHaveProperty("riskLevel");
      expect(result).toHaveProperty("relationship");
      expect(result).toHaveProperty("recommendation");
    });

    it("should throw NotFoundError when male not found", async () => {
      animalRepository.findById.mockResolvedValue(null);

      await expect(
        breedingService.calculateCOI(userId, {
          maleId,
          femaleId,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when female not found", async () => {
      animalRepository.findById.mockResolvedValueOnce(mockMale as any);
      animalRepository.findById.mockResolvedValueOnce(null);

      await expect(
        breedingService.calculateCOI(userId, {
          maleId,
          femaleId,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when user does not own male animal", async () => {
      const otherUserMale = { ...mockMale, userId: "other-user" };
      animalRepository.findById.mockResolvedValueOnce(otherUserMale as any);
      animalRepository.findById.mockResolvedValueOnce(mockFemale as any);

      await expect(
        breedingService.calculateCOI(userId, {
          maleId,
          femaleId,
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("create", () => {
    it("should create breeding successfully", async () => {
      animalRepository.findById.mockResolvedValueOnce(mockMale as any);
      animalRepository.findById.mockResolvedValueOnce(mockFemale as any);
      breedingRepository.create.mockResolvedValue(mockBreeding);

      const result = await breedingService.create(userId, {
        maleId,
        femaleId,
        projectedCOI: 0.03125,
        riskLevel: RiskLevel.GREEN,
        breedingDate: "2024-01-01T00:00:00.000Z",
      });

      expect(result.id).toBe(breedingId);
      expect(result.maleId).toBe(maleId);
      expect(result.femaleId).toBe(femaleId);
    });

    it("should throw NotFoundError when male not found", async () => {
      animalRepository.findById.mockResolvedValue(null);

      await expect(
        breedingService.create(userId, {
          maleId,
          femaleId,
          projectedCOI: 0.03125,
          riskLevel: RiskLevel.GREEN,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when female not found", async () => {
      animalRepository.findById.mockResolvedValueOnce(mockMale as any);
      animalRepository.findById.mockResolvedValueOnce(null);

      await expect(
        breedingService.create(userId, {
          maleId,
          femaleId,
          projectedCOI: 0.03125,
          riskLevel: RiskLevel.GREEN,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when user does not own animals", async () => {
      const otherUserMale = { ...mockMale, userId: "other-user" };
      animalRepository.findById.mockResolvedValueOnce(otherUserMale as any);
      animalRepository.findById.mockResolvedValueOnce(mockFemale as any);

      await expect(
        breedingService.create(userId, {
          maleId,
          femaleId,
          projectedCOI: 0.03125,
          riskLevel: RiskLevel.GREEN,
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getAll", () => {
    it("should get all breedings for user", async () => {
      breedingRepository.findAllByUserId.mockResolvedValue([mockBreeding]);

      const result = await breedingService.getAll(userId);

      expect(result.breedings).toHaveLength(1);
      expect(result.breedings[0].id).toBe(breedingId);
    });
  });

  describe("getById", () => {
    it("should get breeding by id successfully", async () => {
      breedingRepository.findById.mockResolvedValue(mockBreeding);

      const result = await breedingService.getById(breedingId, userId);

      expect(result.id).toBe(breedingId);
      expect(breedingRepository.findById).toHaveBeenCalledWith(breedingId);
    });

    it("should throw NotFoundError when breeding not found", async () => {
      breedingRepository.findById.mockResolvedValue(null);

      await expect(breedingService.getById(breedingId, userId)).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should throw ValidationError when user does not own breeding", async () => {
      const otherUserBreeding = { ...mockBreeding, userId: "other-user" };
      breedingRepository.findById.mockResolvedValue(otherUserBreeding);

      await expect(breedingService.getById(breedingId, userId)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("updateBreeding", () => {
    it("should update breeding successfully", async () => {
      breedingRepository.findById.mockResolvedValue(mockBreeding);
      breedingRepository.update.mockResolvedValue(mockBreeding);

      const result = await breedingService.updateBreeding(breedingId, userId, {
        breedingDate: "2024-01-02T00:00:00.000Z",
        notes: "Updated notes",
      });

      expect(result.id).toBe(breedingId);
      expect(breedingRepository.update).toHaveBeenCalledWith(
        breedingId,
        expect.objectContaining({
          breedingDate: expect.any(Date),
          notes: "Updated notes",
        }),
      );
    });

    it("should throw NotFoundError when breeding not found", async () => {
      breedingRepository.findById.mockResolvedValue(null);

      await expect(
        breedingService.updateBreeding(breedingId, userId, {
          notes: "Updated notes",
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when user does not own breeding", async () => {
      const otherUserBreeding = { ...mockBreeding, userId: "other-user" };
      breedingRepository.findById.mockResolvedValue(otherUserBreeding);

      await expect(
        breedingService.updateBreeding(breedingId, userId, {
          notes: "Updated notes",
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("deleteBreeding", () => {
    it("should delete breeding successfully", async () => {
      breedingRepository.findById.mockResolvedValue(mockBreeding);
      breedingRepository.delete.mockResolvedValue(undefined);

      await breedingService.deleteBreeding(breedingId, userId);

      expect(breedingRepository.delete).toHaveBeenCalledWith(breedingId);
    });

    it("should throw NotFoundError when breeding not found", async () => {
      breedingRepository.findById.mockResolvedValue(null);

      await expect(
        breedingService.deleteBreeding(breedingId, userId),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when user does not own breeding", async () => {
      const otherUserBreeding = { ...mockBreeding, userId: "other-user" };
      breedingRepository.findById.mockResolvedValue(otherUserBreeding);

      await expect(
        breedingService.deleteBreeding(breedingId, userId),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getBreedingHistory", () => {
    it("should get breeding history for animal", async () => {
      animalRepository.findById.mockResolvedValue(mockMale as any);
      breedingRepository.findBreedingHistory.mockResolvedValue([mockBreeding]);

      const result = await breedingService.getBreedingHistory(maleId, userId);

      expect(result.breedings).toHaveLength(1);
      expect(breedingRepository.findBreedingHistory).toHaveBeenCalledWith(
        maleId,
      );
    });

    it("should throw NotFoundError when animal not found", async () => {
      animalRepository.findById.mockResolvedValue(null);

      await expect(
        breedingService.getBreedingHistory(maleId, userId),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when user does not own animal", async () => {
      const otherUserAnimal = { ...mockMale, userId: "other-user" };
      animalRepository.findById.mockResolvedValue(otherUserAnimal as any);

      await expect(
        breedingService.getBreedingHistory(maleId, userId),
      ).rejects.toThrow(ValidationError);
    });
  });
});
