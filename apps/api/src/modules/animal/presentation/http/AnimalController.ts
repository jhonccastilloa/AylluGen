import type {
  CreateAnimalUseCase,
  UpdateAnimalUseCase,
  DeleteAnimalUseCase,
  GetAnimalUseCase,
  ListAnimalUseCase,
  ListAnimalChildrenUseCase,
} from "@ayllugen/core/animal/application/use-cases/index";
import {
  created,
  ok,
  noContent,
} from "../../../../presentation/http/HttpResult";
import type { HttpResult } from "../../../../presentation/http/HttpResult";
import type {
  IAnimalResponseDto,
  IAnimalDetailResponseDto,
  IAnimalPageResponseDto,
} from "./animalDto";
import { AnimalDtoMapper } from "./AnimalDtoMapper";
import {
  animalIdSchema,
  animalQuerySchema,
  animalPaginationSchema,
  createAnimalSchema,
  updateAnimalSchema,
} from "./animalSchema";

interface IAnimalUseCases {
  createAnimalUseCase: CreateAnimalUseCase;
  updateAnimalUseCase: UpdateAnimalUseCase;
  deleteAnimalUseCase: DeleteAnimalUseCase;
  getAnimalUseCase: GetAnimalUseCase;
  listAnimalUseCase: ListAnimalUseCase;
  listAnimalChildrenUseCase: ListAnimalChildrenUseCase;
}

export class AnimalController {
  constructor(private readonly useCases: IAnimalUseCases) {}

  async createAnimal(
    userId: string,
    body: unknown,
  ): Promise<HttpResult<IAnimalResponseDto>> {
    const input = createAnimalSchema.parse(body);
    const animal = await this.useCases.createAnimalUseCase.execute({
      ...input,
      userId,
    });
    return created(AnimalDtoMapper.toResponse(animal));
  }

  async updateAnimal(
    userId: string,
    id: unknown,
    body: unknown,
  ): Promise<HttpResult<IAnimalResponseDto>> {
    const animalId = animalIdSchema.parse(id);
    const input = updateAnimalSchema.parse(body);
    const animal = await this.useCases.updateAnimalUseCase.execute({
      ...input,
      userId,
      id: animalId,
    });
    return ok(AnimalDtoMapper.toResponse(animal));
  }

  async getAnimal(
    userId: string,
    id: unknown,
  ): Promise<HttpResult<IAnimalDetailResponseDto>> {
    const animalId = animalIdSchema.parse(id);
    const result = await this.useCases.getAnimalUseCase.execute(
      userId,
      animalId,
    );
    return ok(AnimalDtoMapper.toDetailResponse(result));
  }

  async listAnimals(
    userId: string,
    query: unknown,
  ): Promise<HttpResult<IAnimalPageResponseDto>> {
    const input = animalQuerySchema.parse(query);
    const result = await this.useCases.listAnimalUseCase.execute({
      ...input,
      userId,
    });
    return ok(AnimalDtoMapper.toPageResponse(result));
  }

  async listChildren(
    userId: string,
    id: unknown,
    query: unknown,
  ): Promise<HttpResult<IAnimalPageResponseDto>> {
    const animalId = animalIdSchema.parse(id);
    const input = animalPaginationSchema.parse(query);
    const result = await this.useCases.listAnimalChildrenUseCase.execute({
      ...input,
      userId,
      id: animalId,
    });
    return ok(AnimalDtoMapper.toPageResponse(result));
  }

  async deleteAnimal(userId: string, id: unknown): Promise<HttpResult<null>> {
    const animalId = animalIdSchema.parse(id);
    await this.useCases.deleteAnimalUseCase.execute(userId, animalId);
    return noContent();
  }
}
