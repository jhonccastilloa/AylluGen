import {
  CreateAnimalUseCase,
  DeleteAnimalUseCase,
  GetAnimalUseCase,
  ListAnimalChildrenUseCase,
  ListAnimalUseCase,
  UpdateAnimalUseCase,
} from "@ayllugen/core/animal/application/use-cases/index";
import {
  ChangePasswordUseCase,
  LoginUseCase,
  LogoutUseCase,
  RefreshTokenUseCase,
  RegisterUseCase,
} from "@ayllugen/core/auth/application/use-cases/index";
import {
  CreateSpecieUseCase,
  DeleteSpecieUseCase,
  GetSpecieUseCase,
  ListSpecieUseCase,
  UpdateSpecieUseCase,
} from "@ayllugen/core/species/application/use-cases/index";
import { GetMyAccountUseCase } from "@ayllugen/core/user/application/use-cases/index";
import { AnimalController } from "../modules/animal/presentation/http/AnimalController";
import { AuthController } from "../modules/auth/presentation/http/AuthController";
import { SpecieController } from "../modules/specie/presentation/http/SpecieController";
import { UserController } from "../modules/user/presentation/http/UserController";
import type { IInfrastructure } from "./infrastructure";

export interface IContainer {
  controllers: {
    animal: AnimalController;
    specie: SpecieController;
    user: UserController;
    auth: AuthController;
  };
}

export type IContainerControllers = IContainer["controllers"];

export const buildContainer = (infrastructure: IInfrastructure): IContainer => {
  const { species, users, auth, animals } = infrastructure.repositories;
  const { idGenerator, passwords, tokens } = infrastructure;

  const specieController = new SpecieController({
    createSpecieUseCase: new CreateSpecieUseCase(species, idGenerator),
    deleteSpecieUseCase: new DeleteSpecieUseCase(species),
    getSpecieUseCase: new GetSpecieUseCase(species),
    listSpecieUseCase: new ListSpecieUseCase(species),
    updateSpecieUseCase: new UpdateSpecieUseCase(species),
  });
  const userController = new UserController({
    getMyAccountUseCase: new GetMyAccountUseCase(users),
  });
  const authController = new AuthController({
    registerUseCase: new RegisterUseCase(
      users,
      auth,
      passwords,
      tokens,
      idGenerator,
    ),
    loginUseCase: new LoginUseCase(users, auth, passwords, tokens),
    refreshTokenUseCase: new RefreshTokenUseCase(users, auth, tokens),
    logoutUseCase: new LogoutUseCase(auth),
    changePasswordUseCase: new ChangePasswordUseCase(users, auth, passwords),
  });

  const animalController = new AnimalController({
    createAnimalUseCase: new CreateAnimalUseCase(animals, idGenerator),
    updateAnimalUseCase: new UpdateAnimalUseCase(animals),
    deleteAnimalUseCase: new DeleteAnimalUseCase(animals),
    getAnimalUseCase: new GetAnimalUseCase(animals),
    listAnimalUseCase: new ListAnimalUseCase(animals),
    listAnimalChildrenUseCase: new ListAnimalChildrenUseCase(animals),
  });

  return {
    controllers: {
      animal: animalController,
      specie: specieController,
      user: userController,
      auth: authController,
    },
  };
};
