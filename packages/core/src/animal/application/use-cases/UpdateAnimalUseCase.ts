import { AnimalEntity } from "../../domain/entities/AnimalEntity";
import type {
  AnimalSex,
  AnimalStatus,
} from "../../domain/entities/AnimalEntity";
import { AnimalError } from "../../domain/errors/AnimalError";
import type { IAnimalRepository } from "../../domain/ports/AnimalRepository";
import { AnimalValidator } from "../services/AnimalValidator";

export interface IUpdateAnimalInput {
  userId: string;
  id: string;
  code?: string;
  crotal?: string | null;
  speciesId?: string;
  sex?: AnimalSex;
  birthDate?: string | null;
  fatherId?: string | null;
  motherId?: string | null;
  status?: AnimalStatus;
  exitDate?: string | null;
}

export class UpdateAnimalUseCase {
  constructor(private readonly animalRepository: IAnimalRepository) {}

  async execute(input: IUpdateAnimalInput): Promise<AnimalEntity> {
    return this.animalRepository.withOwnerTransaction(
      input.userId,
      async (store) => {
        const previous = await store.findById(input.userId, input.id);
        if (!previous)
          throw new AnimalError("ANIMAL_NOT_FOUND", "Animal no encontrado.");
        const status = input.status ?? previous.status;
        const animal = AnimalEntity.create({
          id: previous.id,
          userId: previous.userId,
          code: input.code ?? previous.code,
          crotal: input.crotal === undefined ? previous.crotal : input.crotal,
          speciesId: input.speciesId ?? previous.speciesId,
          sex: input.sex ?? previous.sex,
          birthDate:
            input.birthDate === undefined
              ? previous.birthDate
              : input.birthDate,
          fatherId:
            input.fatherId === undefined ? previous.fatherId : input.fatherId,
          motherId:
            input.motherId === undefined ? previous.motherId : input.motherId,
          status,
          exitDate:
            status === "ACTIVE" && input.exitDate === undefined
              ? null
              : input.exitDate === undefined
                ? previous.exitDate
                : input.exitDate,
          createdAt: previous.createdAt,
          updatedAt: new Date(),
        });
        await AnimalValidator.validateUpdate(store, previous, animal);
        return store.update(animal);
      },
    );
  }
}
