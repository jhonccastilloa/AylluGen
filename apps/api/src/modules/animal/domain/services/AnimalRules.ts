import {
  ValidationError,
  NotFoundError,
} from "../../../../shared/errors/AppError";

export interface RelatedAnimal {
  id: string;
  userId: string;
  sex: string;
  speciesId: string;
}
export function validateParents(
  input: {
    userId: string;
    childSpeciesId: string;
    childId?: string;
    fatherId?: string | null;
    motherId?: string | null;
  },
  father: RelatedAnimal | null,
  mother: RelatedAnimal | null,
): void {
  if (input.fatherId && !father)
    throw new NotFoundError("Animal padre no encontrado");
  if (input.motherId && !mother)
    throw new NotFoundError("Animal madre no encontrado");
  if (father) {
    if (father.userId !== input.userId)
      throw new ValidationError("El padre no pertenece al usuario autenticado");
    if (father.sex !== "MALE")
      throw new ValidationError(
        "El animal seleccionado como padre debe ser macho",
      );
    if (father.id === input.childId)
      throw new ValidationError("Un animal no puede ser su propio padre");
  }
  if (mother) {
    if (mother.userId !== input.userId)
      throw new ValidationError("La madre no pertenece al usuario autenticado");
    if (mother.sex !== "FEMALE")
      throw new ValidationError(
        "El animal seleccionado como madre debe ser hembra",
      );
    if (mother.id === input.childId)
      throw new ValidationError("Un animal no puede ser su propia madre");
  }
  if (father && mother && father.id === mother.id)
    throw new ValidationError(
      "El padre y la madre deben ser animales diferentes",
    );
  if (father && mother && father.speciesId !== mother.speciesId)
    throw new ValidationError(
      "El padre y la madre deben ser de la misma especie",
    );
  if (father && father.speciesId !== input.childSpeciesId)
    throw new ValidationError(
      "La especie de la cría debe coincidir con la especie del padre",
    );
  if (mother && mother.speciesId !== input.childSpeciesId)
    throw new ValidationError(
      "La especie de la cría debe coincidir con la especie de la madre",
    );
}
