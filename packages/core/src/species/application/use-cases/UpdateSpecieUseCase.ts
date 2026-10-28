import { SpecieEntity } from "../../domain/entities/SpecieEntity";
import { SpecieError } from "../../domain/errors/SpecieError";
import type { ISpecieRepository } from "../../domain/ports/SpecieRepository";

export interface IUpdateSpecieInput {
  userId: string;
  id: string;
  name?: string;
  description?: string | null;
}
export class UpdateSpecieUseCase {
  constructor(private readonly repository: ISpecieRepository) {}
  async execute(input: IUpdateSpecieInput): Promise<SpecieEntity> {
    const previousSpecie = await this.repository.findById(
      input.userId,
      input.id,
    );
    if (!previousSpecie)
      throw new SpecieError("SPECIE_NOT_FOUND", "Especie no encontrada.");
    const specie = SpecieEntity.create({
      id: previousSpecie.id,
      userId: input.userId,
      name: input.name ?? previousSpecie.name,
      description:
        input.description === undefined
          ? previousSpecie.description
          : input.description,
    });
    const existing = await this.repository.findByName(
      input.userId,
      specie.name,
    );
    if (existing && existing.id !== specie.id) {
      throw new SpecieError(
        "SPECIE_DUPLICATE",
        "Ya existe una especie con ese nombre.",
      );
    }
    return this.repository.update(specie);
  }
}
