import type {
  AnimalEntity,
  AnimalSex,
} from "../../domain/entities/AnimalEntity";
import { AnimalError } from "../../domain/errors/AnimalError";
import type { IAnimalStore } from "../../domain/ports/AnimalRepository";
import { validateAnimalParent } from "../../domain/services/AnimalRules";

export class AnimalValidator {
  static async validateCreation(
    store: IAnimalStore,
    animal: AnimalEntity,
  ): Promise<void> {
    // A new server-generated ID cannot have existing children or be an ancestor.
    await AnimalValidator.validateCommonRules(store, animal);
  }

  static async validateUpdate(
    store: IAnimalStore,
    previousAnimal: AnimalEntity,
    nextAnimal: AnimalEntity,
  ): Promise<void> {
    if (
      (nextAnimal.sex !== previousAnimal.sex ||
        nextAnimal.speciesId !== previousAnimal.speciesId) &&
      (await store.hasReferences(nextAnimal.userId, nextAnimal.id))
    ) {
      throw new AnimalError(
        "ANIMAL_IN_USE",
        "No se puede cambiar especie o sexo de un animal con descendientes o historial.",
      );
    }

    await AnimalValidator.validateCommonRules(store, nextAnimal);

    const parents: [string | null, string | null][] = [
      [previousAnimal.fatherId, nextAnimal.fatherId],
      [previousAnimal.motherId, nextAnimal.motherId],
    ];
    for (const [previousId, nextId] of parents) {
      if (nextId === null || nextId === previousId) continue;
      if (await store.hasAncestor(nextAnimal.userId, nextId, nextAnimal.id)) {
        throw new AnimalError(
          "ANIMAL_LINEAGE_CYCLE",
          "La relación crearía un ciclo genealógico.",
        );
      }
    }

    if (
      nextAnimal.birthDate !== null &&
      nextAnimal.birthDate !== previousAnimal.birthDate &&
      (await store.hasChildrenBornOnOrBefore(
        nextAnimal.userId,
        nextAnimal.id,
        nextAnimal.birthDate,
      ))
    ) {
      throw new AnimalError(
        "ANIMAL_INVALID_DATES",
        "El animal debe haber nacido antes que sus hijos.",
      );
    }
  }

  private static async validateCommonRules(
    store: IAnimalStore,
    animal: AnimalEntity,
  ): Promise<void> {
    if (!(await store.speciesExists(animal.userId, animal.speciesId))) {
      throw new AnimalError(
        "ANIMAL_SPECIES_NOT_FOUND",
        "Especie no encontrada.",
      );
    }
    const sameCode = await store.findByCode(animal.userId, animal.code);
    if (sameCode && sameCode.id !== animal.id) {
      throw new AnimalError(
        "ANIMAL_DUPLICATE_CODE",
        "El código ya está en uso.",
      );
    }
    if (animal.crotal !== null) {
      const sameCrotal = await store.findByCrotal(animal.userId, animal.crotal);
      if (sameCrotal && sameCrotal.id !== animal.id) {
        throw new AnimalError(
          "ANIMAL_DUPLICATE_CROTAL",
          "El crotal ya está en uso.",
        );
      }
    }
    const parents: [string | null, AnimalSex][] = [
      [animal.fatherId, "MALE"],
      [animal.motherId, "FEMALE"],
    ];
    for (const [id, sex] of parents) {
      if (id === null) continue;
      const parent = await store.findById(animal.userId, id);
      if (!parent)
        throw new AnimalError(
          "ANIMAL_PARENT_NOT_FOUND",
          "Progenitor no encontrado.",
        );
      validateAnimalParent(animal, parent, sex);
    }
  }
}
