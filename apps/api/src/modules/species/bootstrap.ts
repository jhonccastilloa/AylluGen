import { randomUUID } from "node:crypto";
import { CreateSpecies } from "@ayllugen/core/species/create";
import { UpdateSpecies } from "@ayllugen/core/species/update";
import { DeleteSpecies } from "@ayllugen/core/species/delete";
import { ListSpecies } from "@ayllugen/core/species/list";
import { GetSpecies } from "@ayllugen/core/species/get";
import { ResolveSpeciesByCode } from "@ayllugen/core/species/resolve-by-code";
import { InitializeSpeciesCatalog } from "@ayllugen/core/species/initialize-catalog";
import type { SpeciesUnitOfWork } from "@ayllugen/core/species/unit-of-work";
import type { SpeciesRecord } from "./application/SpeciesRecord";
import type { SpeciesUseCases } from "./application/ports/SpeciesUseCasesFactory";

/** DI supplies the Prisma adapter; all use cases come from the shared package. */
export function createSpeciesUseCases(
  unit: SpeciesUnitOfWork<SpeciesRecord>,
  ownerId: string,
): SpeciesUseCases {
  const listSpecies = new ListSpecies(unit, ownerId);
  const resolveSpecies = new ResolveSpeciesByCode(unit, ownerId, randomUUID);
  return {
    createSpecies: new CreateSpecies(unit, ownerId, randomUUID),
    updateSpecies: new UpdateSpecies(unit, ownerId),
    deleteSpecies: new DeleteSpecies(unit, ownerId),
    getSpecies: new GetSpecies(unit, ownerId),
    listSpecies,
    resolveSpecies,
    initializeCatalog: new InitializeSpeciesCatalog(
      listSpecies,
      resolveSpecies,
    ),
  };
}
