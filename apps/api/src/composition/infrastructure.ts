import type { ISpecieRepository } from "@ayllugen/core/species/domain/ports/SpecieRepository";
import { SpeciePrismaRepository } from "../modules/specie/SpeciePrismaRepository";
import {
  prisma,
  type PrismaTransaction,
} from "@infrastructure/database/prisma/client";

export interface IRepositories {
  species: ISpecieRepository;
}

export interface IInfrastructure {
  prisma: PrismaTransaction;
  repositories: IRepositories;
  // shutdown(): Promise<void>;
}

export const buildInfrastructure = (): IInfrastructure => {
  return {
    prisma,
    repositories: {
      species: new SpeciePrismaRepository(prisma),
    },
  };
};
