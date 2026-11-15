import type {
  AnimalSex,
  AnimalStatus,
} from "@ayllugen/core/animal/domain/entities/AnimalEntity";

export interface IAnimalResponseDto {
  id: string;
  code: string;
  crotal: string | null;
  speciesId: string;
  sex: AnimalSex;
  birthDate: string | null;
  fatherId: string | null;
  motherId: string | null;
  isFounder: boolean;
  status: AnimalStatus;
  exitDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IAnimalDetailResponseDto extends IAnimalResponseDto {
  father: IAnimalResponseDto | null;
  mother: IAnimalResponseDto | null;
}

export interface IAnimalPageResponseDto {
  animals: IAnimalResponseDto[];
  total: number;
}
