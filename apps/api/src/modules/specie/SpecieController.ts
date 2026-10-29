import { created, noContent, ok } from "../../protocols/HttpResult";
import type { HttpResult } from "../../protocols/HttpResult";
import type { ISpecieResponseDto } from "./specieDto";
import {
  createSpecieSchema,
  specieIdSchema,
  updateSpecieSchema,
} from "./specieSchema";
import { SpecieDtoMapper } from "./SpecieDtoMapper";
import type {
  CreateSpecieUseCase,
  DeleteSpecieUseCase,
  GetSpecieUseCase,
  ListSpecieUseCase,
  UpdateSpecieUseCase,
} from "@ayllugen/core/species/application/use-cases/index";

interface ISpecieUseCases {
  createSpecieUseCase: CreateSpecieUseCase;
  deleteSpecieUseCase: DeleteSpecieUseCase;
  getSpecieUseCase: GetSpecieUseCase;
  listSpecieUseCase: ListSpecieUseCase;
  updateSpecieUseCase: UpdateSpecieUseCase;
}

export class SpecieController {
  constructor(private readonly useCases: ISpecieUseCases) {}

  async createSpecie(
    userId: string,
    body: unknown,
  ): Promise<HttpResult<ISpecieResponseDto>> {
    const input = createSpecieSchema.parse(body);
    const specie = await this.useCases.createSpecieUseCase.execute({
      ...input,
      userId,
    });
    return created(SpecieDtoMapper.toResponse(specie));
  }

  async listSpecies(
    userId: string,
  ): Promise<HttpResult<ISpecieResponseDto[]>> {
    const species = await this.useCases.listSpecieUseCase.execute(userId);
    return ok(species.map(SpecieDtoMapper.toResponse));
  }

  async getSpecie(
    userId: string,
    id: unknown,
  ): Promise<HttpResult<ISpecieResponseDto>> {
    const specieId = specieIdSchema.parse(id);
    const specie = await this.useCases.getSpecieUseCase.execute(
      userId,
      specieId,
    );
    return ok(SpecieDtoMapper.toResponse(specie));
  }

  async updateSpecie(
    userId: string,
    id: unknown,
    body: unknown,
  ): Promise<HttpResult<ISpecieResponseDto>> {
    const specieId = specieIdSchema.parse(id);
    const input = updateSpecieSchema.parse(body);
    const specie = await this.useCases.updateSpecieUseCase.execute({
      id: specieId,
      ...input,
      userId,
    });
    return ok(SpecieDtoMapper.toResponse(specie));
  }

  async deleteSpecie(userId: string, id: unknown): Promise<HttpResult<null>> {
    const specieId = specieIdSchema.parse(id);
    await this.useCases.deleteSpecieUseCase.execute(userId, specieId);
    return noContent();
  }
}
