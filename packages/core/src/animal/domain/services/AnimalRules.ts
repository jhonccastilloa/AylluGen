import type { AnimalEntity, AnimalSex } from "../entities/AnimalEntity";
import { AnimalError } from "../errors/AnimalError";

export function validateAnimalParent(
  child: AnimalEntity,
  parent: AnimalEntity,
  sex: AnimalSex,
): void {
  if (
    parent.id === child.id ||
    parent.userId !== child.userId ||
    parent.speciesId !== child.speciesId ||
    parent.sex !== sex
  ) {
    throw new AnimalError(
      "ANIMAL_INVALID_PARENT",
      "El progenitor debe pertenecer al usuario y tener especie y sexo compatibles.",
    );
  }
  if (
    parent.birthDate !== null &&
    child.birthDate !== null &&
    parent.birthDate >= child.birthDate
  ) {
    throw new AnimalError(
      "ANIMAL_INVALID_DATES",
      "Los padres deben haber nacido antes que la cría.",
    );
  }
}
