import type { IAnimalPageResult } from "@ayllugen/core/animal/application/results/AnimalPageResult";
import type { IGetAnimalResult } from "@ayllugen/core/animal/application/use-cases/GetAnimalUseCase";
import type { AnimalEntity } from "@ayllugen/core/animal/domain/entities/AnimalEntity";
import type {
  IAnimalResponseDto,
  IAnimalDetailResponseDto,
  IAnimalPageResponseDto,
} from "./animalDto";

export class AnimalDtoMapper {
  static toResponse(animal: AnimalEntity): IAnimalResponseDto {
    return {
      id: animal.id,
      code: animal.code,
      crotal: animal.crotal,
      speciesId: animal.speciesId,
      sex: animal.sex,
      birthDate: animal.birthDate,
      fatherId: animal.fatherId,
      motherId: animal.motherId,
      isFounder: animal.isFounder,
      status: animal.status,
      exitDate: animal.exitDate,
      createdAt: animal.createdAt.toISOString(),
      updatedAt: animal.updatedAt.toISOString(),
    };
  }

  static toDetailResponse(result: IGetAnimalResult): IAnimalDetailResponseDto {
    return {
      ...AnimalDtoMapper.toResponse(result.animal),
      father: result.father ? AnimalDtoMapper.toResponse(result.father) : null,
      mother: result.mother ? AnimalDtoMapper.toResponse(result.mother) : null,
    };
  }

  static toPageResponse(result: IAnimalPageResult): IAnimalPageResponseDto {
    return {
      animals: result.animals.map(AnimalDtoMapper.toResponse),
      total: result.total,
    };
  }
}
