import type { SpecieEntity } from "@ayllugen/core/species/domain/entities/SpecieEntity";
import type { ISpecieResponseDto } from "./specieDto";

export class SpecieDtoMapper {
  static toResponse(specie: SpecieEntity): ISpecieResponseDto {
    return {
      id: specie.id,
      name: specie.name,
      description: specie.description,
    };
  }
}
