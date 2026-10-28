import { UuidIdGenerator } from "@ayllugen/shared/ids/uuid";
import {
  CreateSpecieUseCase,
  DeleteSpecieUseCase,
  GetSpecieUseCase,
  ListSpecieUseCase,
  UpdateSpecieUseCase,
} from "@ayllugen/core/species/application/use-cases/index";
import { SpecieController } from "../modules/specie/SpecieController";
import type { IInfrastructure } from "./infrastructure";

export interface IContainer {
  idGenerator: UuidIdGenerator;
  specieController: SpecieController;
}

export const buildContainer = (infrastructure: IInfrastructure): IContainer => {
  const specieRepository = infrastructure.repositories.species;
  const idGenerator = new UuidIdGenerator();

  const specieController = new SpecieController({
    createSpecieUseCase: new CreateSpecieUseCase(specieRepository, idGenerator),
    deleteSpecieUseCase: new DeleteSpecieUseCase(specieRepository),
    getSpecieUseCase: new GetSpecieUseCase(specieRepository),
    listSpecieUseCase: new ListSpecieUseCase(specieRepository),
    updateSpecieUseCase: new UpdateSpecieUseCase(specieRepository),
  });

  return {
    idGenerator,
    specieController,
  };
};
