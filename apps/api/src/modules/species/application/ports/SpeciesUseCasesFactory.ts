import type { CreateSpecies } from "@ayllugen/core/species/create";
import type { UpdateSpecies } from "@ayllugen/core/species/update";
import type { DeleteSpecies } from "@ayllugen/core/species/delete";
import type { GetSpecies } from "@ayllugen/core/species/get";
import type { ListSpecies } from "@ayllugen/core/species/list";
import type { ResolveSpeciesByCode } from "@ayllugen/core/species/resolve-by-code";
import type { InitializeSpeciesCatalog } from "@ayllugen/core/species/initialize-catalog";
import type { SpeciesRecord } from "../SpeciesRecord";

export interface SpeciesUseCases {
  createSpecies: CreateSpecies<SpeciesRecord>;
  updateSpecies: UpdateSpecies<SpeciesRecord>;
  deleteSpecies: DeleteSpecies<SpeciesRecord>;
  getSpecies: GetSpecies<SpeciesRecord>;
  listSpecies: ListSpecies<SpeciesRecord>;
  resolveSpecies: ResolveSpeciesByCode<SpeciesRecord>;
  initializeCatalog: InitializeSpeciesCatalog<SpeciesRecord>;
}
export type SpeciesUseCasesFactory = (ownerId: string) => SpeciesUseCases;
