import type { IAuthRepository } from "@ayllugen/core/auth/domain/ports/AuthRepository";
import type { IPasswordHasher } from "@ayllugen/core/auth/domain/ports/PasswordHasher";
import type { ITokenService } from "@ayllugen/core/auth/domain/ports/TokenService";
import type { IIdGeneratorPort } from "@ayllugen/core/shared/ports/IdGeneratorPort";
import type { ISpecieRepository } from "@ayllugen/core/species/domain/ports/SpecieRepository";
import type { IUserRepository } from "@ayllugen/core/user/domain/ports/UserRepository";
import { UuidIdGenerator } from "@ayllugen/shared/ids/uuid";
import { prisma } from "@infrastructure/database/prisma/client";
import type { PrismaClient } from "@infrastructure/database/prisma/generated/client";
import { logger } from "../infrastructure/logging/logger";
import { AuthPrismaRepository } from "../modules/auth/infrastructure/persistence/AuthPrismaRepository";
import { BcryptPasswordHasher } from "../modules/auth/infrastructure/security/BcryptPasswordHasher";
import { tokenService } from "../modules/auth/infrastructure/security/tokenService";
import { SpeciePrismaRepository } from "../modules/specie/infrastructure/persistence/SpeciePrismaRepository";
import { UserPrismaRepository } from "../modules/user/infrastructure/persistence/UserPrismaRepository";
import type { ILogger } from "../shared/logging/Logger";

export interface IRepositories {
  species: ISpecieRepository;
  users: IUserRepository;
  auth: IAuthRepository;
}

export interface IInfrastructure {
  logger: ILogger;
  prisma: PrismaClient;
  repositories: IRepositories;
  idGenerator: IIdGeneratorPort;
  passwords: IPasswordHasher;
  tokens: ITokenService;
  shutdown(): Promise<void>;
}

export const buildInfrastructure = (): IInfrastructure => {
  return {
    logger,
    prisma,
    idGenerator: new UuidIdGenerator(),
    passwords: new BcryptPasswordHasher(),
    tokens: tokenService,
    shutdown: () => prisma.$disconnect(),
    repositories: {
      species: new SpeciePrismaRepository(prisma),
      users: new UserPrismaRepository(prisma),
      auth: new AuthPrismaRepository(prisma),
    },
  };
};
