import { randomUUID } from "node:crypto";
import { CreateSpecie } from "@ayllugen/core/species/create";
import { UpdateSpecie } from "@ayllugen/core/species/update";
import { DeleteSpecie } from "@ayllugen/core/species/delete";
import { ListSpecie } from "@ayllugen/core/species/list";
import { GetSpecie } from "@ayllugen/core/species/get";
import { InitializeSpecieCatalog } from "@ayllugen/core/species/initialize-catalog";
import type { ISpecieRepository } from "@ayllugen/core/species/repository";
import type { ISpecieUseCases } from "./application/ports/SpecieUseCasesFactory";

/** DI supplies the Prisma adapter; all use cases come from the shared package. */
export function createSpecieUseCases(
  repository: ISpecieRepository,
): ISpecieUseCases {
  const listSpecie = new ListSpecie(repository);
  return {
    createSpecie: new CreateSpecie(repository, randomUUID),
    updateSpecie: new UpdateSpecie(repository),
    deleteSpecie: new DeleteSpecie(repository),
    getSpecie: new GetSpecie(repository),
    listSpecie,
    initializeCatalog: new InitializeSpecieCatalog(repository, randomUUID),
  };
}
