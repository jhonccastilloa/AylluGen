import type { CreateSpecie } from "@ayllugen/core/species/create";
import type { UpdateSpecie } from "@ayllugen/core/species/update";
import type { DeleteSpecie } from "@ayllugen/core/species/delete";
import type { GetSpecie } from "@ayllugen/core/species/get";
import type { ListSpecie } from "@ayllugen/core/species/list";
import type { InitializeSpecieCatalog } from "@ayllugen/core/species/initialize-catalog";

export interface ISpecieUseCases {
  createSpecie: CreateSpecie;
  updateSpecie: UpdateSpecie;
  deleteSpecie: DeleteSpecie;
  getSpecie: GetSpecie;
  listSpecie: ListSpecie;
  initializeCatalog: InitializeSpecieCatalog;
}
export type SpecieUseCasesFactory = (ownerId: string) => ISpecieUseCases;
