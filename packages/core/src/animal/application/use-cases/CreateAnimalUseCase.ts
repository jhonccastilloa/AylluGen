import { AnimalEntity } from "../../domain/entities/AnimalEntity";
import type {
  AnimalSex,
  AnimalStatus,
} from "../../domain/entities/AnimalEntity";
import type { IAnimalRepository } from "../../domain/ports/AnimalRepository";
import type { IIdGeneratorPort } from "../../../shared/ports/IdGeneratorPort";
import { AnimalValidator } from "../services/AnimalValidator";

export interface ICreateAnimalInput {
  userId: string;
  code: string;
  crotal?: string | null;
  speciesId: string;
  sex: AnimalSex;
  birthDate?: string | null;
  fatherId?: string | null;
  motherId?: string | null;
  status?: AnimalStatus;
  exitDate?: string | null;
}

export class CreateAnimalUseCase {
  constructor(
    private readonly animalRepository: IAnimalRepository,
    private readonly idGenerator: IIdGeneratorPort,
  ) {}

  async execute(input: ICreateAnimalInput): Promise<AnimalEntity> {
    const now = new Date();
    const animal = AnimalEntity.create({
      id: this.idGenerator.generate(),
      userId: input.userId,
      code: input.code,
      crotal: input.crotal ?? null,
      speciesId: input.speciesId,
      sex: input.sex,
      birthDate: input.birthDate ?? null,
      fatherId: input.fatherId ?? null,
      motherId: input.motherId ?? null,
      status: input.status ?? "ACTIVE",
      exitDate: input.exitDate ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return this.animalRepository.withOwnerTransaction(
      input.userId,
      async (store) => {
        await AnimalValidator.validateCreation(store, animal);
        return store.create(animal);
      },
    );
  }
}
