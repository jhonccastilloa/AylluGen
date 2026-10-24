import { randomUUID } from "node:crypto";
import { CreateSpecies } from "@ayllugen/core/species/create";
import { UpdateSpecies } from "@ayllugen/core/species/update";
import { DeleteSpecies } from "@ayllugen/core/species/delete";
import { ListSpecies } from "@ayllugen/core/species/list";
import { GetSpecies } from "@ayllugen/core/species/get";
import { ResolveSpeciesByCode } from "@ayllugen/core/species/resolve-by-code";
import { InitializeSpeciesCatalog } from "@ayllugen/core/species/initialize-catalog";
import type { SpeciesRepository } from "@ayllugen/core/species/repository";
import type { SpeciesRecord } from "./application/SpeciesRecord";
import type { SpeciesUseCases } from "./application/ports/SpeciesUseCasesFactory";

/** DI supplies the Prisma adapter; all use cases come from the shared package. */
export function createSpeciesUseCases(
  repository: SpeciesRepository<SpeciesRecord>,
): SpeciesUseCases {
  const listSpecies = new ListSpecies(repository);
  const resolveSpecies = new ResolveSpeciesByCode(repository, randomUUID);
  return {
    createSpecies: new CreateSpecies(repository, randomUUID),
    updateSpecies: new UpdateSpecies(repository),
    deleteSpecies: new DeleteSpecies(repository),
    getSpecies: new GetSpecies(repository),
    listSpecies,
    resolveSpecies,
    initializeCatalog: new InitializeSpeciesCatalog(
      listSpecies,
      resolveSpecies,
    ),
  };
}
