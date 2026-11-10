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
import { AuthController } from "../modules/auth/presentation/http/AuthController";
import { SpecieController } from "../modules/specie/presentation/http/SpecieController";
import { UserController } from "../modules/user/presentation/http/UserController";
import type { IInfrastructure } from "./infrastructure";

export interface IContainer {
  controllers: {
    specie: SpecieController;
    user: UserController;
    auth: AuthController;
  };
}

export type IContainerControllers = IContainer["controllers"];

export const buildContainer = (infrastructure: IInfrastructure): IContainer => {
  const { species, users, auth } = infrastructure.repositories;
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

  return {
    controllers: {
      specie: specieController,
      user: userController,
      auth: authController,
    },
  };
};
