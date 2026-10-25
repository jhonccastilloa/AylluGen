import { IIdGeneratorPort } from "../../../shared/ports/IdGeneratorPort";
import { SpecieEntity } from "../../domain/entities/SpecieEntity";
import { SpecieError } from "../../domain/errors/SpecieError";
import { ISpecieRepository } from "../../domain/ports/SpecieRepository";
export interface ICreateSpecieInput {
  name: string;
  description?: string | null;
}
export class CreateSpecie {
  constructor(
    private readonly repository: ISpecieRepository,
    private readonly idGenerator: IIdGeneratorPort,
  ) {}
  async execute(input: ICreateSpecieInput): Promise<SpecieEntity> {
    const specie = SpecieEntity.create({
      id: this.idGenerator.generate(),
      userId: this.repository.ownerId,
      name: input.name,
      description: input.description ?? null,
    });
    const existing = await this.repository.findByName(specie.name);
    if (existing) {
      throw new SpecieError(
        "SPECIE_DUPLICATE",
        "Ya existe una especie con ese nombre.",
      );
    }
    return this.repository.insert(specie);
  }
}
