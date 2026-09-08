import { injectable, inject } from "inversify";
import { TYPES } from "../../../../shared/di/types";
import { ISpeciesRepository } from "../../domain/repositories/ISpeciesRepository";
import {
  SpeciesCreateInput,
  SpeciesResponse,
  SpeciesUpdateInput,
} from "../schemas/species.schema";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../../../shared/errors/AppError";
import { Species } from "../../domain/entities/Species";

interface DefaultSpecies {
  code: string;
  name: string;
  description?: string;
}

const DEFAULT_SPECIES: DefaultSpecies[] = [
  { code: "ALPACA", name: "Alpaca" },
  { code: "SHEEP", name: "Sheep" },
  { code: "LLAMA", name: "Llama" },
  { code: "VICUGNA", name: "Vicugna" },
];

const normalizeSpeciesCode = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");

@injectable()
export class SpeciesService {
  constructor(
    @inject(TYPES.ISpeciesRepository)
    private speciesRepository: ISpeciesRepository,
  ) {}

  async getAll(userId: string): Promise<SpeciesResponse[]> {
    await this.ensureDefaultSpecies(userId);
    const species = await this.speciesRepository.findAllByUserId(userId);
    return species.map((item) => this.mapToResponse(item));
  }

  async getById(speciesId: string, userId: string): Promise<SpeciesResponse> {
    await this.ensureDefaultSpecies(userId);
    const species = await this.speciesRepository.findById(speciesId);
    if (!species || species.userId !== userId) {
      throw new NotFoundError("Especie no encontrada");
    }
    return this.mapToResponse(species);
  }

  async create(
    userId: string,
    payload: SpeciesCreateInput,
  ): Promise<SpeciesResponse> {
    const code = normalizeSpeciesCode(payload.code);
    if (!code) {
      throw new ValidationError("El código de especie no es válido");
    }

    const [existingByCode, existingByName] = await Promise.all([
      this.speciesRepository.findByCode(userId, code),
      this.speciesRepository.findByName(userId, payload.name.trim()),
    ]);

    if (existingByCode) {
      throw new ConflictError("Ya existe una especie con ese código");
    }

    if (existingByName) {
      throw new ConflictError("Ya existe una especie con ese nombre");
    }

    const created = await this.speciesRepository.create({
      userId,
      code,
      name: payload.name.trim(),
      description: payload.description?.trim() || undefined,
    });

    return this.mapToResponse(created);
  }

  async update(
    speciesId: string,
    userId: string,
    payload: SpeciesUpdateInput,
  ): Promise<SpeciesResponse> {
    const existing = await this.speciesRepository.findById(speciesId);
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError("Especie no encontrada");
    }

    const nextCode = payload.code
      ? normalizeSpeciesCode(payload.code)
      : undefined;
    if (payload.code && !nextCode) {
      throw new ValidationError("El código de especie no es válido");
    }

    if (nextCode && nextCode !== existing.code) {
      const duplicateCode = await this.speciesRepository.findByCode(userId, nextCode);
      if (duplicateCode) {
        throw new ConflictError("Ya existe una especie con ese código");
      }
    }

    const nextName = payload.name?.trim();
    if (nextName && nextName !== existing.name) {
      const duplicateName = await this.speciesRepository.findByName(
        userId,
        nextName,
      );
      if (duplicateName) {
        throw new ConflictError("Ya existe una especie con ese nombre");
      }
    }

    const updated = await this.speciesRepository.update(speciesId, {
      code: nextCode,
      name: nextName,
      description:
        payload.description !== undefined
          ? payload.description.trim() || undefined
          : undefined,
    });

    return this.mapToResponse(updated);
  }

  async delete(speciesId: string, userId: string): Promise<void> {
    const species = await this.speciesRepository.findById(speciesId);
    if (!species || species.userId !== userId) {
      throw new NotFoundError("Especie no encontrada");
    }

    const linkedAnimalsCount = await this.speciesRepository.countAnimalsBySpeciesId(
      userId,
      speciesId,
    );
    if (linkedAnimalsCount > 0) {
      throw new ValidationError(
        "No se puede eliminar la especie porque está asociada a uno o más animales",
      );
    }

    await this.speciesRepository.delete(speciesId);
  }

  async resolveSpeciesForAnimal(
    userId: string,
    input: { speciesId?: string; speciesCode?: string; species?: string },
  ): Promise<{ speciesId: string; speciesCode: string; speciesName: string }> {
    await this.ensureDefaultSpecies(userId);

    if (input.speciesId) {
      const speciesById = await this.speciesRepository.findById(input.speciesId);
      if (!speciesById || speciesById.userId !== userId) {
        throw new ValidationError("La especie seleccionada no existe");
      }

      return {
        speciesId: speciesById.id,
        speciesCode: speciesById.code,
        speciesName: speciesById.name,
      };
    }

    const rawCode = input.speciesCode ?? input.species;
    if (!rawCode) {
      throw new ValidationError(
        "Debe enviar speciesId o speciesCode para crear un animal",
      );
    }

    const normalizedCode = normalizeSpeciesCode(rawCode);
    if (!normalizedCode) {
      throw new ValidationError("El código de especie no es válido");
    }

    const speciesByCode = await this.speciesRepository.findByCode(
      userId,
      normalizedCode,
    );
    if (speciesByCode) {
      return {
        speciesId: speciesByCode.id,
        speciesCode: speciesByCode.code,
        speciesName: speciesByCode.name,
      };
    }

    const autoCreated = await this.speciesRepository.create({
      userId,
      code: normalizedCode,
      name: normalizedCode,
    });

    return {
      speciesId: autoCreated.id,
      speciesCode: autoCreated.code,
      speciesName: autoCreated.name,
    };
  }

  async ensureDefaultSpecies(userId: string): Promise<void> {
    const currentSpecies = await this.speciesRepository.findAllByUserId(userId);
    if (currentSpecies.length > 0) return;

    for (const item of DEFAULT_SPECIES) {
      await this.speciesRepository.create({
        userId,
        code: item.code,
        name: item.name,
        description: item.description,
      });
    }
  }

  private mapToResponse(species: Species): SpeciesResponse {
    return {
      id: species.id,
      code: species.code,
      name: species.name,
      description: species.description ?? null,
      userId: species.userId,
      createdAt: species.createdAt.toISOString(),
      updatedAt: species.updatedAt.toISOString(),
    };
  }
}

