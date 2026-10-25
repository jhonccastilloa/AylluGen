import { SpecieEntity } from "@ayllugen/core/species/entity";
import { ISpecieResponseDto } from "./specieDto";

export class SpecieDtoMapper {
  static toResponse(specie: SpecieEntity): ISpecieResponseDto {
    return {
      id: specie.id,
      name: specie.name,
      description: specie.description,
    };
  }
}
