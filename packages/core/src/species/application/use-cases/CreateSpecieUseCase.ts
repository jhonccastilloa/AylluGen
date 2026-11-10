import type { IIdGeneratorPort } from "../../../shared/ports/IdGeneratorPort";
import { SpecieEntity } from "../../domain/entities/SpecieEntity";
import { SpecieError } from "../../domain/errors/SpecieError";
import type { ISpecieRepository } from "../../domain/ports/SpecieRepository";
export interface ICreateSpecieInput {
  userId: string;
  name: string;
  description?: string | null;
}
export class CreateSpecieUseCase {
  constructor(
    private readonly repository: ISpecieRepository,
    private readonly idGenerator: IIdGeneratorPort,
  ) {}
  async execute(input: ICreateSpecieInput): Promise<SpecieEntity> {
    const specie = SpecieEntity.create({
      id: this.idGenerator.generate(),
      userId: input.userId,
      name: input.name,
      description: input.description ?? null,
    });
    const existing = await this.repository.findByName(
      input.userId,
      specie.name,
    );
    if (existing) {
      throw new SpecieError(
        "SPECIE_DUPLICATE",
        "Ya existe una especie con ese nombre.",
      );
    }
    return this.repository.insert(specie);
  }
}
