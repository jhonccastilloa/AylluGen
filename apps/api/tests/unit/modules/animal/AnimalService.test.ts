import { AnimalService } from "../../../../src/modules/animal/application/services/AnimalService";
import { IAnimalRepository } from "../../../../src/modules/animal/domain/repositories/IAnimalRepository";
import {
  Animal,
  Sex,
  SyncStatus,
} from "../../../../src/modules/animal/domain/entities/Animal";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../../../src/shared/errors/AppError";
import { TYPES } from "../../../../src/shared/di/types";
import { Container } from "inversify";
import { SpeciesService } from "../../../../src/modules/species/application/services/SpeciesService";
const Species = { SHEEP: "SHEEP", ALPACA: "ALPACA" };

describe("AnimalService", () => {
  let animalService: AnimalService;
  let animalRepository: jest.Mocked<IAnimalRepository>;
  let container: Container;

  const userId = "user-123";
  const animalId = "animal-123";
  const fatherId = "father-123";
  const motherId = "mother-123";

  const mockAnimal: Animal = {
    id: animalId,
    crotal: "CR12345",
    sex: Sex.FEMALE,
    species: "SHEEP",
    speciesId: "species-sheep",
    birthDate: new Date("2024-01-01"),
    isFounder: false,
    fatherId,
    motherId,
    userId,
    syncStatus: SyncStatus.SYNCED,
    syncVersion: 1,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  const mockFather: Animal = {
    id: fatherId,
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

  const mockMother: Animal = {
    id: motherId,
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

  beforeEach(() => {
    container = new Container({ autobind: true });
    container.bind<SpeciesService>(TYPES.SpeciesService).toConstantValue({
      resolveSpeciesForAnimal: jest
        .fn()
        .mockResolvedValue({
          speciesId: "species-sheep",
          speciesCode: "SHEEP",
          speciesName: "Sheep",
        }),
    } as unknown as SpeciesService);
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
      .bind<IAnimalRepository>(TYPES.IAnimalRepository)
      .toConstantValue(animalRepository);
    animalService = container.get<AnimalService>(AnimalService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create animal successfully", async () => {
      animalRepository.findByCrotal.mockResolvedValue(null);
      animalRepository.findById
        .mockResolvedValueOnce(mockFather)
        .mockResolvedValueOnce(mockMother);
      animalRepository.create.mockResolvedValue(mockAnimal);

      const result = await animalService.create(userId, {
        crotal: "CR12345",
        sex: Sex.FEMALE,
        species: "SHEEP",
        speciesId: "species-sheep",
        birthDate: "2024-01-01T00:00:00.000Z",
        isFounder: false,
        fatherId,
        motherId,
      });

      expect(result.id).toBe(animalId);
      expect(result.crotal).toBe("CR12345");
      expect(animalRepository.findByCrotal).toHaveBeenCalledWith(
        "CR12345",
        userId,
      );
    });

    it("should throw ConflictError when crotal already exists", async () => {
      animalRepository.findByCrotal.mockResolvedValue(mockAnimal);

      await expect(
        animalService.create(userId, {
          crotal: "CR12345",
          sex: Sex.FEMALE,
          species: "SHEEP",
          speciesId: "species-sheep",
          isFounder: false,
        }),
      ).rejects.toThrow(ConflictError);
    });

    it("should throw NotFoundError when father not found", async () => {
      animalRepository.findByCrotal.mockResolvedValue(null);
      animalRepository.findById.mockResolvedValue(null);

      await expect(
        animalService.create(userId, {
          crotal: "CR12345",
          sex: Sex.FEMALE,
          species: "SHEEP",
          speciesId: "species-sheep",
          isFounder: false,
          fatherId,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when mother not found", async () => {
      animalRepository.findByCrotal.mockResolvedValue(null);
      animalRepository.findById.mockResolvedValue(mockFather);
      animalRepository.findById.mockResolvedValue(null);

      await expect(
        animalService.create(userId, {
          crotal: "CR12345",
          sex: Sex.FEMALE,
          species: "SHEEP",
          speciesId: "species-sheep",
          isFounder: false,
          motherId,
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("update", () => {
    it("should update animal successfully", async () => {
      animalRepository.findById
        .mockResolvedValueOnce(mockAnimal)
        .mockResolvedValueOnce(mockFather)
        .mockResolvedValueOnce(mockMother);
      animalRepository.update.mockResolvedValue(mockAnimal);

      const result = await animalService.update(animalId, userId, {
        crotal: "CR12346",
      });

      expect(result.id).toBe(animalId);
      expect(animalRepository.update).toHaveBeenCalledWith(
        animalId,
        expect.objectContaining({
          crotal: "CR12346",
        }),
      );
    });

    it("should throw NotFoundError when animal not found", async () => {
      animalRepository.findById.mockResolvedValue(null);

      await expect(
        animalService.update(animalId, userId, {
          crotal: "CR12346",
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when user does not own animal", async () => {
      const otherUserAnimal = { ...mockAnimal, userId: "other-user" };
      animalRepository.findById.mockResolvedValue(otherUserAnimal);

      await expect(
        animalService.update(animalId, userId, {
          crotal: "CR12346",
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("delete", () => {
    it("should delete animal successfully", async () => {
      animalRepository.findById.mockResolvedValue(mockAnimal);
      animalRepository.delete.mockResolvedValue(undefined);

      await animalService.delete(animalId, userId);

      expect(animalRepository.delete).toHaveBeenCalledWith(animalId);
    });

    it("should throw NotFoundError when animal not found", async () => {
      animalRepository.findById.mockResolvedValue(null);

      await expect(animalService.delete(animalId, userId)).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should throw ValidationError when user does not own animal", async () => {
      const otherUserAnimal = { ...mockAnimal, userId: "other-user" };
      animalRepository.findById.mockResolvedValue(otherUserAnimal);

      await expect(animalService.delete(animalId, userId)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("getAnimal", () => {
    it("should get animal successfully", async () => {
      animalRepository.findById.mockResolvedValue(mockAnimal);

      const result = await animalService.getAnimal(animalId, userId);

      expect(result.id).toBe(animalId);
      expect(animalRepository.findById).toHaveBeenCalledWith(animalId);
    });

    it("should throw NotFoundError when animal not found", async () => {
      animalRepository.findById.mockResolvedValue(null);

      await expect(animalService.getAnimal(animalId, userId)).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should throw ValidationError when user does not own animal", async () => {
      const otherUserAnimal = { ...mockAnimal, userId: "other-user" };
      animalRepository.findById.mockResolvedValue(otherUserAnimal);

      await expect(animalService.getAnimal(animalId, userId)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("getAll", () => {
    it("should get all animals for user", async () => {
      animalRepository.findAllByUserId.mockResolvedValue([mockAnimal]);

      const result = await animalService.getAll(userId, {
        limit: 10,
        offset: 0,
      });

      expect(result.animals).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should filter animals by species", async () => {
      animalRepository.findAllByUserId.mockResolvedValue([mockAnimal]);

      const result = await animalService.getAll(userId, {
        species: "SHEEP",
        limit: 10,
        offset: 0,
      });

      expect(result.animals).toHaveLength(1);
      expect(result.animals[0].species).toBe(Species.SHEEP);
    });

    it("should filter animals by sex", async () => {
      animalRepository.findAllByUserId.mockResolvedValue([mockAnimal]);

      const result = await animalService.getAll(userId, {
        sex: Sex.FEMALE,
        limit: 10,
        offset: 0,
      });

      expect(result.animals).toHaveLength(1);
      expect(result.animals[0].sex).toBe(Sex.FEMALE);
    });

    it("should filter animals by isFounder", async () => {
      animalRepository.findAllByUserId.mockResolvedValue([mockAnimal]);

      const result = await animalService.getAll(userId, {
        isFounder: false,
        limit: 10,
        offset: 0,
      });

      expect(result.animals).toHaveLength(1);
      expect(result.animals[0].isFounder).toBe(false);
    });

    it("should search animals by crotal", async () => {
      animalRepository.findAllByUserId.mockResolvedValue([mockAnimal]);

      const result = await animalService.getAll(userId, {
        search: "CR123",
        limit: 10,
        offset: 0,
      });

      expect(result.animals).toHaveLength(1);
      expect(result.animals[0].crotal).toContain("CR123");
    });

    it("should paginate animals correctly", async () => {
      const animals = Array.from({ length: 20 }, (_, i) => ({
        ...mockAnimal,
        id: `animal-${i}`,
        crotal: `CR${i}`,
      }));
      animalRepository.findAllByUserId.mockResolvedValue(animals);

      const result = await animalService.getAll(userId, {
        limit: 10,
        offset: 0,
      });

      expect(result.animals).toHaveLength(10);
      expect(result.total).toBe(20);
    });
  });

  describe("getPedigree", () => {
    it("should get pedigree successfully", async () => {
      const pedigreeAnimal = {
        ...mockAnimal,
        father: mockFather,
        mother: mockMother,
      };
      animalRepository.findPedigree.mockResolvedValue(pedigreeAnimal);

      const result = await animalService.getPedigree(animalId, userId);

      expect(result?.id).toBe(animalId);
      expect(result?.father).toBeDefined();
      expect(result?.mother).toBeDefined();
    });

    it("should throw NotFoundError when animal not found", async () => {
      animalRepository.findPedigree.mockResolvedValue(null);

      await expect(animalService.getPedigree(animalId, userId)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("getFounders", () => {
    it("should get founders successfully", async () => {
      const founders = [mockFather, mockMother];
      animalRepository.findFounders.mockResolvedValue(founders);

      const result = await animalService.getFounders(userId);

      expect(result).toHaveLength(2);
      expect(result[0].isFounder).toBe(true);
    });
  });

  describe("getMales", () => {
    it("should get males successfully", async () => {
      const males = [mockFather];
      animalRepository.findBySex.mockResolvedValue(males);

      const result = await animalService.getMales(userId);

      expect(result).toHaveLength(1);
      expect(result[0].sex).toBe(Sex.MALE);
    });
  });

  describe("getFemales", () => {
    it("should get females successfully", async () => {
      const females = [mockMother];
      animalRepository.findBySex.mockResolvedValue(females);

      const result = await animalService.getFemales(userId);

      expect(result).toHaveLength(1);
      expect(result[0].sex).toBe(Sex.FEMALE);
    });
  });
});
