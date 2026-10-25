import { created, HttpResult } from "../../protocols/HttpResult";
import { ISpecieResponseDto } from "./specieDto";
import { createSpecieSchema } from "./specieSchema";
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
  async createSpecie(body: unknown): Promise<HttpResult<ISpecieResponseDto>> {
    const input = createSpecieSchema.parse(body);
    const specie = await this.useCases.createSpecieUseCase.execute(input);
    return created(SpecieDtoMapper.toResponse(specie));
  }
}
