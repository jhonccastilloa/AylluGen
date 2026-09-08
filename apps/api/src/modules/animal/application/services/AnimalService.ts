import { injectable, inject } from "inversify";
import { IAnimalRepository } from "../../domain/repositories/IAnimalRepository";
import { TYPES } from "../../../../shared/di/types";
import {
  AnimalCreateInput,
  AnimalQueryInput,
  AnimalResponse,
  AnimalUpdateInput,
} from "../schemas/animal.schema";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../../../shared/errors/AppError";
import {
  Animal,
  AnimalCreateDTO,
  AnimalUpdateDTO,
  Sex,
} from "../../domain/entities/Animal";
import { SpeciesService } from "../../../species/application/services/SpeciesService";
import { validateParents } from "../../domain/services/AnimalRules";

@injectable()
export class AnimalService {
  constructor(
    @inject(TYPES.IAnimalRepository)
    private animalRepository: IAnimalRepository,
    @inject(TYPES.SpeciesService)
    private speciesService: SpeciesService,
  ) {}

  async create(
    userId: string,
    data: AnimalCreateInput,
  ): Promise<AnimalResponse> {
    const resolvedSpecies = await this.speciesService.resolveSpeciesForAnimal(
      userId,
      {
        speciesId: data.speciesId,
        speciesCode: data.speciesCode,
        species: data.species,
      },
    );

    const createData: AnimalCreateDTO = {
      crotal: data.crotal,
      sex: data.sex,
      speciesId: resolvedSpecies.speciesId,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      isFounder: data.isFounder ?? false,
      fatherId: data.fatherId,
      motherId: data.motherId,
      userId,
    };
    const existing = await this.animalRepository.findByCrotal(
      data.crotal,
      userId,
    );
    if (existing) {
      throw new ConflictError("El crotal ya está en uso");
    }

    await this.validateParentCompatibility({
      userId,
      childSpeciesId: resolvedSpecies.speciesId,
      fatherId: data.fatherId,
      motherId: data.motherId,
    });

    const animal = await this.animalRepository.create(createData);
    return this.mapToResponse(animal);
  }

  async update(
    id: string,
    userId: string,
    data: AnimalUpdateInput,
  ): Promise<AnimalResponse> {
    const animal = await this.animalRepository.findById(id);
    if (!animal) {
      throw new NotFoundError("Animal no encontrado");
    }

    if (animal.userId !== userId) {
      throw new ValidationError(
        "No tienes permiso para actualizar este animal",
      );
    }
    const updateData: AnimalUpdateDTO = {
      crotal: data.crotal,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      isFounder: data.isFounder,
      fatherId: data.fatherId,
      motherId: data.motherId,
    };

    if (data.speciesId || data.speciesCode) {
      const resolvedSpecies = await this.speciesService.resolveSpeciesForAnimal(
        userId,
        {
          speciesId: data.speciesId,
          speciesCode: data.speciesCode,
        },
      );
      updateData.speciesId = resolvedSpecies.speciesId;
    }

    const nextSpeciesId = updateData.speciesId ?? animal.speciesId;
    const nextFatherId = data.fatherId ?? animal.fatherId;
    const nextMotherId = data.motherId ?? animal.motherId;

    await this.validateParentCompatibility({
      userId,
      childSpeciesId: nextSpeciesId,
      fatherId: nextFatherId,
      motherId: nextMotherId,
      childId: id,
    });

    const updated = await this.animalRepository.update(id, updateData);

    return this.mapToResponse(updated);
  }

  async delete(id: string, userId: string): Promise<void> {
    const animal = await this.animalRepository.findById(id);
    if (!animal) {
      throw new NotFoundError("Animal not found");
    }

    if (animal.userId !== userId) {
      throw new ValidationError(
        "You do not have permission to delete this animal",
      );
    }

    await this.animalRepository.delete(id);
  }

  async getAnimal(id: string, userId: string): Promise<AnimalResponse> {
    const animal = await this.animalRepository.findById(id);
    if (!animal) {
      throw new NotFoundError("Animal not found");
    }

    if (animal.userId !== userId) {
      throw new ValidationError(
        "You do not have permission to view this animal",
      );
    }

    return this.mapToResponse(animal);
  }

  async getAll(
    userId: string,
    query: AnimalQueryInput,
  ): Promise<{ animals: AnimalResponse[]; total: number }> {
    const { species, sex, isFounder, search, limit, offset } = query;

    let animals = await this.animalRepository.findAllByUserId(userId);

    if (species) {
      animals = animals.filter((a) => a.species === species);
    }

    if (sex) {
      animals = animals.filter((a) => a.sex === sex);
    }

    if (typeof isFounder === "boolean") {
      animals = animals.filter((a) => a.isFounder === isFounder);
    }

    if (search) {
      animals = animals.filter((a) =>
        a.crotal.toLowerCase().includes(search.toLowerCase()),
      );
    }

    const total = animals.length;
    const paginated = animals.slice(offset, offset + limit);

    return { animals: paginated.map((a) => this.mapToResponse(a)), total };
  }

  async getPedigree(
    id: string,
    userId: string,
  ): Promise<AnimalResponse | null> {
    const animal = await this.animalRepository.findPedigree(id);
    if (!animal) {
      throw new NotFoundError("Animal not found");
    }

    if (animal.userId !== userId) {
      throw new ValidationError(
        "You do not have permission to view this pedigree",
      );
    }

    return this.mapToResponse(animal);
  }

  async getFounders(userId: string): Promise<AnimalResponse[]> {
    const founders = await this.animalRepository.findFounders(userId);
    return founders.map((founder) => this.mapToResponse(founder));
  }

  async getMales(userId: string): Promise<AnimalResponse[]> {
    const males = await this.animalRepository.findBySex(userId, Sex.MALE);
    return males.map((male) => this.mapToResponse(male));
  }

  async getFemales(userId: string): Promise<AnimalResponse[]> {
    const females = await this.animalRepository.findBySex(userId, Sex.FEMALE);
    return females.map((female) => this.mapToResponse(female));
  }

  private mapToResponse(animal: Animal): AnimalResponse {
    return {
      id: animal.id,
      crotal: animal.crotal,
      sex: animal.sex,
      speciesId: animal.speciesId,
      species: animal.species,
      speciesName: animal.speciesName ?? null,
      birthDate: animal.birthDate?.toISOString() || null,
      isFounder: animal.isFounder,
      fatherId: animal.fatherId || null,
      motherId: animal.motherId || null,
      father: animal.father ? this.mapToResponse(animal.father) : undefined,
      mother: animal.mother ? this.mapToResponse(animal.mother) : undefined,
      children:
        animal.children?.map((child) => this.mapToResponse(child)) || [],
      userId: animal.userId,
      syncStatus: animal.syncStatus,
      syncVersion: animal.syncVersion,
      clientCreatedAt: (
        animal.clientCreatedAt ?? animal.createdAt
      ).toISOString(),
      clientUpdatedAt: (
        animal.clientUpdatedAt ?? animal.updatedAt
      ).toISOString(),
      createdAt: animal.createdAt.toISOString(),
      updatedAt: animal.updatedAt.toISOString(),
      deletedAt: animal.deletedAt?.toISOString() || null,
    };
  }

  private async validateParentCompatibility(input: {
    userId: string;
    childSpeciesId: string;
    fatherId?: string;
    motherId?: string;
    childId?: string;
  }): Promise<void> {
    const father = input.fatherId
      ? await this.animalRepository.findById(input.fatherId)
      : null;
    const mother = input.motherId
      ? await this.animalRepository.findById(input.motherId)
      : null;
    validateParents(input, father, mother);
  }
}
