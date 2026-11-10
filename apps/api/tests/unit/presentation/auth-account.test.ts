import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";
import { UserEntity } from "@ayllugen/core/user/domain/entities/UserEntity";
import type { IUserRepository } from "@ayllugen/core/user/domain/ports/UserRepository";
import type { IAuthRepository } from "@ayllugen/core/auth/domain/ports/AuthRepository";
import type { RefreshTokenEntity } from "@ayllugen/core/auth/domain/entities/RefreshTokenEntity";
import {
  ChangePasswordUseCase,
  LoginUseCase,
  LogoutUseCase,
  RefreshTokenUseCase,
  RegisterUseCase,
} from "@ayllugen/core/auth/application/use-cases/index";
import { GetMyAccountUseCase } from "@ayllugen/core/user/application/use-cases/index";
import { AuthController } from "../../../src/modules/auth/presentation/http/AuthController";
import { UserController } from "../../../src/modules/user/presentation/http/UserController";
import { createAuthRouter } from "../../../src/modules/auth/presentation/http/AuthRouter";
import { createUserRouter } from "../../../src/modules/user/presentation/http/UserRouter";
import { BcryptPasswordHasher } from "../../../src/modules/auth/infrastructure/security/BcryptPasswordHasher";
import { JwtTokenService } from "../../../src/modules/auth/infrastructure/security/JwtTokenService";
import { makeErrorHandler } from "../../../src/presentation/middlewares/http-error.middleware";
import type { ILogger } from "../../../src/shared/logging/Logger";
import { config } from "../../../src/shared/constants/config";

describe("User/Auth HTTP contract with real JWT and bcrypt", () => {
  let server: Server;
  let base: string;
  const accounts = new Map<string, UserEntity>();
  const sessions = new Map<string, RefreshTokenEntity>();
  const users: IUserRepository = {
    findById: async (id) => accounts.get(id) ?? null,
    findByDni: async (dni) =>
      [...accounts.values()].find((u) => u.dni === dni) ?? null,
  };
  const auth: IAuthRepository = {
    register: async (u, s) => {
      accounts.set(u.id, u);
      sessions.set(s.token, s);
      return u;
    },
    openSession: async (u, s) => {
      if (accounts.get(u.id)?.passwordHash !== u.passwordHash) return false;
      sessions.set(s.token, s);
      return true;
    },
    rotateSession: async (u, previous, s) => {
      const old = sessions.get(previous);
      if (
        !old ||
        old.userId !== u.id ||
        old.expiresAt <= new Date() ||
        accounts.get(u.id)?.passwordHash !== u.passwordHash
      )
        return false;
      sessions.delete(previous);
      sessions.set(s.token, s);
      return true;
    },
    closeSession: async (token) => {
      sessions.delete(token);
    },
    changePassword: async (u, hash) => {
      if (accounts.get(u.id)?.passwordHash !== u.passwordHash) return false;
      accounts.set(
        u.id,
        UserEntity.restore({
          id: u.id,
          dni: u.dni,
          passwordHash: hash,
          createdAt: u.createdAt,
          updatedAt: new Date(),
        }),
      );
      for (const [token, session] of sessions)
        if (session.userId === u.id) sessions.delete(token);
      return true;
    },
  };
  const password = "Password123!";
  const tokens = new JwtTokenService(config);
  beforeAll(async () => {
    const hashes = new BcryptPasswordHasher();
    const controller = new AuthController({
      registerUseCase: new RegisterUseCase(users, auth, hashes, tokens, {
        generate: randomUUID,
      }),
      loginUseCase: new LoginUseCase(users, auth, hashes, tokens),
      refreshTokenUseCase: new RefreshTokenUseCase(users, auth, tokens),
      logoutUseCase: new LogoutUseCase(auth),
      changePasswordUseCase: new ChangePasswordUseCase(users, auth, hashes),
    });
    const app = express();
    app.use(express.json());
    app.use("/api/auth", createAuthRouter(controller));
    app.use(
      "/api/users",
      createUserRouter(
        new UserController({
          getMyAccountUseCase: new GetMyAccountUseCase(users),
        }),
      ),
    );
    app.use(makeErrorHandler({ error: jest.fn() } as unknown as ILogger));
    server = await new Promise<Server>((resolve) => {
      const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  });
  beforeEach(() => {
    accounts.clear();
    sessions.clear();
  });
  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  });

  const post = (route: string, body: unknown, token?: string) =>
    fetch(`${base}/auth/${route}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  const register = async (dni = "12345678") => {
    const response = await post("register", { dni, password });
    expect(response.status).toBe(201);
    return response.json() as Promise<{
      accessToken: string;
      refreshToken: string;
      user: { id: string; dni: string };
    }>;
  };

  test("registers and reads only my account, with no password or hash in responses", async () => {
    const session = await register();
    const other = await register("87654321");
    const response = await fetch(`${base}/users/me?userId=${other.user.id}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject(session.user);
    expect(JSON.stringify(body)).not.toMatch(/password|hash|props/i);
    expect(JSON.stringify(session)).not.toMatch(/password|hash|props/i);
    expect((await fetch(`${base}/users/me`)).status).toBe(401);
    expect(
      (
        await fetch(`${base}/users/${other.user.id}`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
      ).status,
    ).toBe(404);
    expect((await post("register", { dni: "12345678", password })).status).toBe(
      409,
    );
  });

  test("supports multiple sessions, rotates tokens once and logs out idempotently", async () => {
    const first = await register();
    const secondResponse = await post("login", {
      dni: first.user.dni,
      password,
    });
    const second = (await secondResponse.json()) as typeof first;
    expect(secondResponse.status).toBe(200);
    expect(first.refreshToken).not.toBe(second.refreshToken);
    expect(sessions.size).toBe(2);
    const competing = await Promise.all([
      post("refresh", { refreshToken: first.refreshToken }),
      post("refresh", { refreshToken: first.refreshToken }),
    ]);
    expect(competing.map((r) => r.status).sort()).toEqual([200, 401]);
    const rotated = (await competing
      .find((r) => r.status === 200)!
      .json()) as typeof first;
    expect(rotated.refreshToken).not.toBe(first.refreshToken);
    expect(sessions.has(second.refreshToken)).toBe(true);
    for (let i = 0; i < 2; i++)
      expect(
        (await post("logout", { refreshToken: rotated.refreshToken })).status,
      ).toBe(204);
    expect(
      (await post("refresh", { refreshToken: rotated.refreshToken })).status,
    ).toBe(401);
    expect(
      (await post("refresh", { refreshToken: second.refreshToken })).status,
    ).toBe(200);
  });

  test("changes passwords with current credentials and invalidates all refresh sessions only for that user", async () => {
    const first = await register();
    const second = (await (
      await post("login", { dni: first.user.dni, password })
    ).json()) as typeof first;
    const other = await register("87654321");
    expect(
      (
        await post(
          "change-password",
          { currentPassword: "wrong", newPassword: "NewPassword123!" },
          first.accessToken,
        )
      ).status,
    ).toBe(401);
    expect(sessions.size).toBe(3);
    expect(
      (
        await post(
          "change-password",
          { currentPassword: password, newPassword: "NewPassword123!" },
          first.accessToken,
        )
      ).status,
    ).toBe(204);
    for (const s of [first, second])
      expect(
        (await post("refresh", { refreshToken: s.refreshToken })).status,
      ).toBe(401);
    expect(
      (await post("refresh", { refreshToken: other.refreshToken })).status,
    ).toBe(200);
    expect(
      (await post("login", { dni: first.user.dni, password })).status,
    ).toBe(401);
    expect(
      (
        await post("login", {
          dni: first.user.dni,
          password: "NewPassword123!",
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await fetch(`${base}/users/me`, {
          headers: { Authorization: `Bearer ${first.accessToken}` },
        })
      ).status,
    ).toBe(200);
  });

  test("rejects invalid identities, weak or oversized UTF-8 passwords, and access tokens used for refresh", async () => {
    for (const invalid of ["123", "abcdefgh"])
      expect((await post("register", { dni: invalid, password })).status).toBe(
        400,
      );
    for (const invalid of ["short", "A1!" + "é".repeat(35)])
      expect(
        (await post("register", { dni: "12345678", password: invalid })).status,
      ).toBe(400);
    expect(accounts.size).toBe(0);
    const s = await register();
    expect(
      (await post("refresh", { refreshToken: s.accessToken })).status,
    ).toBe(401);
    const unknown = await post("login", { dni: "87654321", password });
    const incorrect = await post("login", {
      dni: s.user.dni,
      password: "Wrong123!",
    });
    expect(unknown.status).toBe(401);
    expect(await unknown.json()).toEqual(await incorrect.json());
    expect(incorrect.headers.get("WWW-Authenticate")).toBe("Bearer");
    const missing = tokens.issue({
      userId: randomUUID(),
      dni: "00000000",
    }).accessToken;
    expect(
      (
        await fetch(`${base}/users/me`, {
          headers: { Authorization: `Bearer ${missing}` },
        })
      ).status,
    ).toBe(404);
  });
});
