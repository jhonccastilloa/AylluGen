import { injectable, inject } from "inversify";
import { IBreedingRepository } from "../../domain/repositories/IBreedingRepository";
import { IAnimalRepository } from "../../../animal/domain/repositories/IAnimalRepository";
import { TYPES } from "../../../../shared/di/types";
import { GeneticEngine } from "../../domain/services/GeneticEngine";
import {
  BreedingCreateInput,
  BreedingMatchInput,
  BreedingResponse,
  BreedingUpdateInput as BreedingUpdateSchemaInput,
  COICalculationResponse,
} from "../schemas/breeding.schema";
import {
  NotFoundError,
  ValidationError,
} from "../../../../shared/errors/AppError";
import {
  Breeding,
  BreedingUpdateInput as BreedingUpdateEntityInput,
} from "../../domain/entities/Breeding";
import { Animal } from "../../../animal/domain/entities/Animal";

@injectable()
export class BreedingService {
  private geneticEngine: GeneticEngine;

  constructor(
    @inject(TYPES.IBreedingRepository)
    private breedingRepository: IBreedingRepository,
    @inject(TYPES.IAnimalRepository)
    private animalRepository: IAnimalRepository,
  ) {
    this.geneticEngine = new GeneticEngine();
  }

  async calculateCOI(
    userId: string,
    matchData: BreedingMatchInput,
  ): Promise<COICalculationResponse> {
    const male = await this.animalRepository.findById(matchData.maleId);
    const female = await this.animalRepository.findById(matchData.femaleId);

    if (!male) {
      throw new NotFoundError("Male animal not found");
    }

    if (!female) {
      throw new NotFoundError("Female animal not found");
    }

    if (male.userId !== userId || female.userId !== userId) {
      throw new ValidationError(
        "You do not have permission to access these animals",
      );
    }

    const pedigree = await this.buildPedigree([male.id, female.id], 4);
    const result = this.geneticEngine.calculateCOI(male, female, pedigree);

    return {
      coi: result.coi,
      riskLevel: result.riskLevel,
      relationship: result.relationship,
      recommendation: this.geneticEngine.getRecommendation(
        result.coi,
        result.riskLevel,
      ),
    };
  }

  async create(
    userId: string,
    data: BreedingCreateInput,
  ): Promise<BreedingResponse> {
    const male = await this.animalRepository.findById(data.maleId);
    const female = await this.animalRepository.findById(data.femaleId);

    if (!male) {
      throw new NotFoundError("Male animal not found");
    }

    if (!female) {
      throw new NotFoundError("Female animal not found");
    }

    if (male.userId !== userId || female.userId !== userId) {
      throw new ValidationError(
        "You do not have permission to access these animals",
      );
    }

    const breeding = await this.breedingRepository.create({
      ...data,
      userId,
      breedingDate: data.breedingDate ? new Date(data.breedingDate) : undefined,
    });

    return this.mapToResponse(breeding);
  }

  async getAll(userId: string): Promise<{ breedings: BreedingResponse[] }> {
    const breedings = await this.breedingRepository.findAllByUserId(userId);
    return { breedings: breedings.map((breeding) => this.mapToResponse(breeding)) };
  }

  async getById(id: string, userId: string): Promise<BreedingResponse> {
    const breeding = await this.breedingRepository.findById(id);
    if (!breeding) {
      throw new NotFoundError("Breeding not found");
    }

    if (breeding.userId !== userId) {
      throw new ValidationError(
        "You do not have permission to view this breeding",
      );
    }

    return this.mapToResponse(breeding);
  }

  async updateBreeding(
    id: string,
    userId: string,
    data: BreedingUpdateSchemaInput,
  ): Promise<BreedingResponse> {
    const breeding = await this.breedingRepository.findById(id);
    if (!breeding) {
      throw new NotFoundError("Breeding not found");
    }

    if (breeding.userId !== userId) {
      throw new ValidationError(
        "You do not have permission to update this breeding",
      );
    }

    const updateData: BreedingUpdateEntityInput = {
      ...data,
      breedingDate: data.breedingDate ? new Date(data.breedingDate) : undefined,
    };

    const updated = await this.breedingRepository.update(id, updateData);

    return this.mapToResponse(updated);
  }

  async deleteBreeding(id: string, userId: string): Promise<void> {
    const breeding = await this.breedingRepository.findById(id);
    if (!breeding) {
      throw new NotFoundError("Breeding not found");
    }

    if (breeding.userId !== userId) {
      throw new ValidationError(
        "You do not have permission to delete this breeding",
      );
    }

    await this.breedingRepository.delete(id);
  }

  async getBreedingHistory(
    animalId: string,
    userId: string,
  ): Promise<{ breedings: BreedingResponse[] }> {
    const animal = await this.animalRepository.findById(animalId);
    if (!animal) {
      throw new NotFoundError("Animal not found");
    }

    if (animal.userId !== userId) {
      throw new ValidationError(
        "You do not have permission to view this breeding history",
      );
    }

    const breedings = await this.breedingRepository.findBreedingHistory(animalId);
    return { breedings: breedings.map((breeding) => this.mapToResponse(breeding)) };
  }

  private async buildPedigree(
    startIds: string[],
    depth: number,
  ): Promise<Map<string, Animal>> {
    const pedigree = new Map<string, Animal>();
    const queue: { id: string; currentDepth: number }[] = startIds.map(
      (id) => ({ id, currentDepth: 0 }),
    );

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }

      const { id, currentDepth } = current;
      if (currentDepth > depth || pedigree.has(id)) {
        continue;
      }

      const animal = await this.animalRepository.findById(id);
      if (!animal) {
        continue;
      }

      pedigree.set(id, animal);

      if (animal.fatherId && !pedigree.has(animal.fatherId)) {
        queue.push({ id: animal.fatherId, currentDepth: currentDepth + 1 });
      }

      if (animal.motherId && !pedigree.has(animal.motherId)) {
        queue.push({ id: animal.motherId, currentDepth: currentDepth + 1 });
      }
    }

    return pedigree;
  }

  private mapToResponse(breeding: Breeding): BreedingResponse {
    return {
      id: breeding.id,
      maleId: breeding.maleId,
      femaleId: breeding.femaleId,
      projectedCOI: breeding.projectedCOI,
      riskLevel: breeding.riskLevel,
      offspringId: breeding.offspringId || null,
      offspring: breeding.offspring
        ? {
            id: breeding.offspring.id,
            crotal: breeding.offspring.crotal,
            sex: breeding.offspring.sex,
            speciesId: breeding.offspring.speciesId,
            species: breeding.offspring.species,
            speciesName: breeding.offspring.speciesName ?? null,
            birthDate: breeding.offspring.birthDate?.toISOString() || null,
            isFounder: breeding.offspring.isFounder,
          }
        : null,
      breedingDate: breeding.breedingDate?.toISOString() || null,
      notes: breeding.notes || null,
      userId: breeding.userId,
      syncStatus: breeding.syncStatus,
      syncVersion: breeding.syncVersion,
      clientCreatedAt: (breeding.clientCreatedAt ?? breeding.createdAt).toISOString(),
      clientUpdatedAt: (breeding.clientUpdatedAt ?? breeding.updatedAt).toISOString(),
      createdAt: breeding.createdAt.toISOString(),
      updatedAt: breeding.updatedAt.toISOString(),
    };
  }
}
