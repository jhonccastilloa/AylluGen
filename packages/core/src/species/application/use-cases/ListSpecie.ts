import { SpecieEntity } from "../../domain/entities/SpecieEntity";
import type { ISpecieRepository } from "../../domain/ports/SpecieRepository";

export class ListSpecie {
  constructor(private readonly repository: ISpecieRepository) {}
  execute(): Promise<SpecieEntity[]> {
    return this.repository.list();
  }
}
