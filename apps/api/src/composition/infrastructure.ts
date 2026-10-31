import type { ISpecieRepository } from "@ayllugen/core/species/domain/ports/SpecieRepository";
import { SpeciePrismaRepository } from "../modules/specie/infrastructure/persistence/SpeciePrismaRepository";
import { logger } from "../infrastructure/logging/logger";
import type { ILogger } from "../shared/logging/Logger";
import {
  prisma,
  type PrismaTransaction,
} from "@infrastructure/database/prisma/client";

export interface IRepositories {
  species: ISpecieRepository;
}

export interface IInfrastructure {
  logger: ILogger;
  prisma: PrismaTransaction;
  repositories: IRepositories;
  // shutdown(): Promise<void>;
}

export const buildInfrastructure = (): IInfrastructure => {
  return {
    logger,
    prisma,
    repositories: {
      species: new SpeciePrismaRepository(prisma),
    },
  };
};
