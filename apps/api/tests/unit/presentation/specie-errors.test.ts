import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { JsonWebTokenError, TokenExpiredError, sign } from "jsonwebtoken";
import { SpecieError } from "@ayllugen/core/species/domain/errors/SpecieError";
import { DomainError } from "@ayllugen/core/errors/domain";
import type { DomainErrorKind } from "@ayllugen/core/errors/domain";
import type { SpecieErrorCode } from "@ayllugen/core/species/domain/errors/SpecieError";
import type { ISpecieRepository } from "@ayllugen/core/species/domain/ports/SpecieRepository";
import { CreateSpecieUseCase } from "@ayllugen/core/species/application/use-cases/CreateSpecieUseCase";
import { DeleteSpecieUseCase } from "@ayllugen/core/species/application/use-cases/DeleteSpecieUseCase";
import { GetSpecieUseCase } from "@ayllugen/core/species/application/use-cases/GetSpecieUseCase";
import { ListSpecieUseCase } from "@ayllugen/core/species/application/use-cases/ListSpecieUseCase";
import { UpdateSpecieUseCase } from "@ayllugen/core/species/application/use-cases/UpdateSpecieUseCase";
import { SpecieController } from "../../../src/modules/specie/presentation/http/SpecieController";
import { createSpecieRouter } from "../../../src/modules/specie/presentation/http/SpecieRouter";
import { mapHttpError } from "../../../src/presentation/errors/mapHttpError";
import { errorHandler } from "../../../src/presentation/middlewares/http-error.middleware";
import { generateAccessToken } from "../../../src/shared/utils/jwt";
import { TOKEN_CONFIG } from "../../../src/shared/constants/tokens";
import { logger } from "../../../src/shared/logging";

jest.mock("../../../src/shared/logging", () => ({
  logger: { error: jest.fn() },
}));

describe("Species error translation", () => {
  test.each<[DomainErrorKind, number]>([
    ["validation", 400], ["not_found", 404], ["conflict", 409],
  ])("maps another module's %s error without module-specific registration", (kind, statusCode) => {
    class AnotherModuleError extends DomainError {
      constructor() {
        super("ANOTHER_MODULE_FAILURE", kind, "Mensaje de negocio");
      }
    }
    const error = new AnotherModuleError();
    expect(mapHttpError(error)).toEqual({
      statusCode,
      body: { error: "Mensaje de negocio", code: "ANOTHER_MODULE_FAILURE" },
    });
    expect(error).not.toHaveProperty("statusCode");
    expect(error).not.toHaveProperty("isOperational");
  });

  test("Species specializes the shared domain contract", () => {
    const error = new SpecieError("SPECIE_IN_USE", "En uso");
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({ kind: "conflict", code: "SPECIE_IN_USE", name: "SpecieError" });
  });

  test.each<[SpecieErrorCode, number]>([
    ["SPECIE_INVALID", 400],
    ["SPECIE_NOT_FOUND", 404],
    ["SPECIE_DUPLICATE", 409],
    ["SPECIE_IN_USE", 409],
    ["SPECIE_CONFLICT", 409],
  ])("maps %s to %s without technical properties", (code, statusCode) => {
    expect(mapHttpError(new SpecieError(code, "Mensaje público"))).toEqual({
      statusCode,
      body: { error: "Mensaje público", code },
    });
  });

  test.each([null, undefined, "secret", new Error("database password"), { statusCode: 400, message: "secret" }])(
    "conceals unknown failures: %p",
    (error) => {
      expect(mapHttpError(error)).toEqual({
        statusCode: 500,
        body: { error: "Error interno del servidor.", code: "INTERNAL_SERVER_ERROR" },
      });
    },
  );

  test("maps JWT failures without exposing library messages", () => {
    expect(mapHttpError(new JsonWebTokenError("private detail")).body.code).toBe("INVALID_TOKEN");
    expect(mapHttpError(new TokenExpiredError("private detail", new Date())).body.code).toBe("TOKEN_EXPIRED");
  });

  test("delegates errors when a response has already started", () => {
    const next = jest.fn();
    const error = new Error("stream failure");
    errorHandler(error, {} as Parameters<typeof errorHandler>[1],
      { headersSent: true } as Parameters<typeof errorHandler>[2], next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("Species HTTP error flow", () => {
  let server: Server;
  let baseUrl: string;
  let token: string;
  const repository: jest.Mocked<ISpecieRepository> = {
    list: jest.fn(), findById: jest.fn(), findByName: jest.fn(),
    hasAnimals: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn(),
  };

  beforeAll(async () => {
    const controller = new SpecieController({
      createSpecieUseCase: new CreateSpecieUseCase(repository, { generate: () => "test-id" }),
      getSpecieUseCase: new GetSpecieUseCase(repository),
      listSpecieUseCase: new ListSpecieUseCase(repository),
      updateSpecieUseCase: new UpdateSpecieUseCase(repository),
      deleteSpecieUseCase: new DeleteSpecieUseCase(repository),
    });
    const app = express();
    app.use(express.json({ limit: "1kb" }));
    app.use("/species", createSpecieRouter(controller));
    app.use(errorHandler);
    server = await new Promise<Server>((resolve) => {
      const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/species`;
    token = generateAccessToken({ userId: "owner", dni: "12345678" });
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  const post = (body: string) => fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body,
  });

  test("rejects unauthenticated requests", async () => {
    const response = await fetch(baseUrl);
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
    expect(await response.json()).toMatchObject({ code: "AUTHENTICATION_ERROR" });
    expect(repository.list).not.toHaveBeenCalled();
  });

  test.each([
    "Bearer", "Basic {token}", "OtroEsquema {token}",
    "Bearer {token} extra", "Bearer {token},otro", "Bearer\t{token}",
  ])("rejects malformed credentials: %s", async (header) => {
    const response = await fetch(baseUrl, {
      headers: { Authorization: header.replace("{token}", token) },
    });
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
    expect(await response.json()).toMatchObject({ code: "AUTHENTICATION_ERROR" });
    expect(repository.list).not.toHaveBeenCalled();
  });

  test.each(["Bearer", "bearer", "bEaReR", "Bearer  "])(
    "accepts a valid token with scheme %s", async (scheme) => {
      repository.list.mockResolvedValueOnce([]);
      const response = await fetch(baseUrl, {
        headers: { Authorization: `${scheme} ${token}` },
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([]);
      expect(repository.list).toHaveBeenCalledWith("owner");
      expect(response.headers.has("WWW-Authenticate")).toBe(false);
    },
  );

  test.each(["invalid", "expired"])("rejects a %s JWT after parsing Bearer", async (kind) => {
    const credential = kind === "expired"
      ? sign({ userId: "owner", dni: "12345678" }, TOKEN_CONFIG.ACCESS_TOKEN.secret, { expiresIn: -1 })
      : "invalid.jwt.token";
    const response = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${credential}` },
    });
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
    expect(await response.json()).toMatchObject({ code: kind === "expired" ? "TOKEN_EXPIRED" : "INVALID_TOKEN" });
    expect(repository.list).not.toHaveBeenCalled();
  });

  test("maps Zod and domain validation separately", async () => {
    const malformed = await post(JSON.stringify({ name: 42 }));
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toMatchObject({ code: "VALIDATION_ERROR", details: [{ path: ["name"] }] });
    const invalid = await post(JSON.stringify({ name: " " }));
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({ code: "SPECIE_INVALID" });
    expect(repository.insert).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  test("returns 404 for a missing species", async () => {
    repository.findById.mockResolvedValueOnce(null);
    const response = await fetch(`${baseUrl}/550e8400-e29b-41d4-a716-446655440000`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "SPECIE_NOT_FOUND" });
  });

  test("propagates asynchronous domain and unexpected repository failures", async () => {
    repository.findByName.mockRejectedValueOnce(new SpecieError("SPECIE_DUPLICATE", "Duplicada"));
    const conflict = await post(JSON.stringify({ name: "Alpaca" }));
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({ code: "SPECIE_DUPLICATE" });
    repository.findByName.mockRejectedValueOnce(new Error("private database values"));
    const failure = await post(JSON.stringify({ name: "Alpaca" }));
    expect(failure.status).toBe(500);
    expect(await failure.json()).toEqual({ error: "Error interno del servidor.", code: "INTERNAL_SERVER_ERROR" });
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(jest.mocked(logger.error).mock.calls)).not.toContain("private database values");
  });

  test("handles parser errors before the router runs", async () => {
    const invalid = await post('{"name":');
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({ code: "INVALID_JSON" });
    const oversized = await post(JSON.stringify({ name: "a".repeat(2000) }));
    expect(oversized.status).toBe(413);
    expect(await oversized.json()).toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
    expect(repository.insert).not.toHaveBeenCalled();
  });
});
