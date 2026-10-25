import { SpecieEntity } from "../../domain/entities/SpecieEntity";
import { SpecieError } from "../../domain/errors/SpecieError";
import type { ISpecieRepository } from "../../domain/ports/SpecieRepository";

export interface IUpdateSpecieInput {
  id: string;
  userId?: string;
  name?: string;
  description?: string;
}
export class UpdateSpecie {
  constructor(private readonly repository: ISpecieRepository) {}
  async execute(input: IUpdateSpecieInput): Promise<SpecieEntity> {
    const previousSpecie = await this.repository.findById(input.id);
    if (!previousSpecie)
      throw new Error("SPECIE_NOT_FOUND: Especie no encontrada.");
    const specie = SpecieEntity.create({
      id: previousSpecie.id,
      userId: input.userId ?? previousSpecie.userId,
      name: input.name ?? previousSpecie.name,
      description: input.description ?? previousSpecie.description,
    });
    const existing = await this.repository.findByName(specie.name);
    if (existing) {
      throw new SpecieError(
        "SPECIE_DUPLICATE",
        "Ya existe una especie con ese nombre.",
      );
    }
    return this.repository.update(specie);
  }
}
