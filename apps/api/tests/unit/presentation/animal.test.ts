import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";
import {
  CreateAnimalUseCase,
  UpdateAnimalUseCase,
  DeleteAnimalUseCase,
  GetAnimalUseCase,
  ListAnimalUseCase,
  ListAnimalChildrenUseCase,
} from "@ayllugen/core/animal/application/use-cases/index";
import { AnimalMemoryRepository } from "../../helpers/AnimalMemoryRepository";
import { AnimalController } from "../../../src/modules/animal/presentation/http/AnimalController";
import { createAnimalRouter } from "../../../src/modules/animal/presentation/http/AnimalRouter";
import {
  animalResponseSchema,
  animalDetailResponseSchema,
  animalPageResponseSchema,
} from "../../../src/modules/animal/presentation/http/animalSchema";
import { JwtTokenService } from "../../../src/modules/auth/infrastructure/security/JwtTokenService";
import { config } from "../../../src/shared/constants/config";
import { makeErrorHandler } from "../../../src/presentation/middlewares/http-error.middleware";
import type { ILogger } from "../../../src/shared/logging/Logger";
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { registerAnimalsRoutes } from "../../../src/infrastructure/openapi/features/animals.openapi";

describe("Animal HTTP and business rules", () => {
  const repo = new AnimalMemoryRepository();
  const owner = randomUUID();
  const other = randomUUID();
  const speciesId = randomUUID();
  const otherSpeciesId = randomUUID();
  const tokens = new JwtTokenService(config);
  const token = tokens.issue({ userId: owner, dni: "12345678" }).accessToken;
  const otherToken = tokens.issue({
    userId: other,
    dni: "87654321",
  }).accessToken;
  let server: Server;
  let base: string;
  beforeAll(async () => {
    const controller = new AnimalController({
      createAnimalUseCase: new CreateAnimalUseCase(repo, {
        generate: randomUUID,
      }),
      updateAnimalUseCase: new UpdateAnimalUseCase(repo),
      deleteAnimalUseCase: new DeleteAnimalUseCase(repo),
      getAnimalUseCase: new GetAnimalUseCase(repo),
      listAnimalUseCase: new ListAnimalUseCase(repo),
      listAnimalChildrenUseCase: new ListAnimalChildrenUseCase(repo),
    });
    const app = express();
    app.use(express.json());
    app.use("/api/animals", createAnimalRouter(controller));
    app.use(makeErrorHandler({ error: jest.fn() } as unknown as ILogger));
    server = await new Promise<Server>((resolve) => {
      const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/animals`;
  });
  beforeEach(() => {
    repo.animals.clear();
    repo.species.clear();
    repo.referenced.clear();
    repo.species.set(speciesId, owner);
    repo.species.set(otherSpeciesId, other);
  });
  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  const request = (
    method: string,
    path = "",
    body?: unknown,
    bearer: string | null = token,
  ) =>
    fetch(`${base}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  const create = async (
    changes: Record<string, unknown> = {},
    bearer = token,
  ) => {
    const response = await request(
      "POST",
      "",
      { code: randomUUID(), sex: "FEMALE", speciesId, ...changes },
      bearer,
    );
    expect(response.status).toBe(201);
    return animalResponseSchema.parse(await response.json());
  };
  const expectError = async (
    response: Response,
    status: number,
    code?: string,
  ) => {
    expect(response.status).toBe(status);
    if (code) expect(await response.json()).toMatchObject({ code });
  };

  test("normalizes identifiers, returns date-only values and excludes internal fields", async () => {
    const animal = await create({
      code: " a-01 ",
      crotal: " cr-1 ",
      birthDate: "2020-02-29",
    });
    expect(animal).toMatchObject({
      code: "A-01",
      crotal: "CR-1",
      birthDate: "2020-02-29",
      status: "ACTIVE",
      isFounder: true,
    });
    const response = await request("GET", `/${animal.id}`);
    const detail = await response.json();
    animalDetailResponseSchema.parse(detail);
    expect(detail).toMatchObject({ father: null, mother: null });
    for (const key of [
      "userId",
      "clientCreatedAt",
      "clientUpdatedAt",
      "deletedAt",
      "species",
      "speciesName",
    ])
      expect(detail).not.toHaveProperty(key);
  });

  test("enforces ownership and authentication for reads, mutations, species and parents", async () => {
    const animal = await create();
    await expectError(await request("GET", "", undefined, null), 401);
    await expectError(
      await request("GET", `/${animal.id}`, undefined, otherToken),
      404,
      "ANIMAL_NOT_FOUND",
    );
    await expectError(
      await request("PUT", `/${animal.id}`, { code: "OTHER" }, otherToken),
      404,
    );
    await expectError(
      await request("DELETE", `/${animal.id}`, undefined, otherToken),
      404,
    );
    await expectError(
      await request("GET", `/${animal.id}/children`, undefined, otherToken),
      404,
    );
    await expectError(
      await request("POST", "", {
        code: "X",
        sex: "MALE",
        speciesId: otherSpeciesId,
      }),
      404,
      "ANIMAL_SPECIES_NOT_FOUND",
    );
    const foreign = await create(
      { speciesId: otherSpeciesId, sex: "MALE" },
      otherToken,
    );
    await expectError(
      await request("PUT", `/${animal.id}`, { fatherId: foreign.id }),
      404,
      "ANIMAL_PARENT_NOT_FOUND",
    );
  });

  test("reserves identifiers in all states and releases them after restricted physical deletion", async () => {
    const animal = await create({ code: "A", crotal: "TAG", status: "SOLD" });
    await expectError(
      await request("POST", "", { code: " a ", speciesId, sex: "MALE" }),
      409,
      "ANIMAL_DUPLICATE_CODE",
    );
    await expectError(
      await request("POST", "", {
        code: "B",
        crotal: "tag",
        speciesId,
        sex: "MALE",
      }),
      409,
      "ANIMAL_DUPLICATE_CROTAL",
    );
    const second = await create({ code: "B" });
    await expectError(
      await request("PUT", `/${second.id}`, { code: "a" }),
      409,
    );
    const otherAnimal = await create(
      { code: "A", crotal: "TAG", speciesId: otherSpeciesId },
      otherToken,
    );
    expect(otherAnimal.id).not.toBe(animal.id);
    expect((await request("DELETE", `/${animal.id}`)).status).toBe(204);
    const replacement = await create({ code: "A", crotal: "TAG" });
    expect(replacement.id).not.toBe(animal.id);
  });

  test("allows partial lineage and null removal, preserving omitted fields and historical parents", async () => {
    const father = await create({
      sex: "MALE",
      status: "DECEASED",
      birthDate: "2010-01-01",
    });
    const child = await create({
      fatherId: father.id,
      birthDate: "2020-01-01",
      crotal: "TAG",
    });
    expect(child.isFounder).toBe(false);
    const detail = animalDetailResponseSchema.parse(
      await (await request("GET", `/${child.id}`)).json(),
    );
    expect(detail.father?.status).toBe("DECEASED");
    const response = await request("PUT", `/${child.id}`, {
      fatherId: null,
      crotal: null,
      birthDate: null,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: child.code,
      isFounder: true,
      fatherId: null,
      crotal: null,
      birthDate: null,
    });
  });

  test("rejects wrong sex, wrong species, self-parenting and cycles across multiple generations", async () => {
    const grandfather = await create({ sex: "MALE" });
    const father = await create({ sex: "MALE", fatherId: grandfather.id });
    const son = await create({ sex: "MALE", fatherId: father.id });
    await expectError(
      await request("PUT", `/${grandfather.id}`, { fatherId: son.id }),
      400,
      "ANIMAL_LINEAGE_CYCLE",
    );
    await expectError(
      await request("PUT", `/${son.id}`, { motherId: grandfather.id }),
      400,
      "ANIMAL_INVALID_PARENT",
    );
    await expectError(
      await request("PUT", `/${son.id}`, { fatherId: son.id }),
      400,
      "ANIMAL_INVALID_PARENT",
    );
    const species2 = randomUUID();
    repo.species.set(species2, owner);
    const unrelated = await create({ speciesId: species2, sex: "MALE" });
    await expectError(
      await request("PUT", `/${son.id}`, { fatherId: unrelated.id }),
      400,
      "ANIMAL_INVALID_PARENT",
    );
  });

  test("checks birth chronology in both directions and rejects invalid/future dates", async () => {
    const father = await create({ sex: "MALE", birthDate: "2010-01-01" });
    const child = await create({
      fatherId: father.id,
      birthDate: "2020-01-01",
    });
    await expectError(
      await request("PUT", `/${father.id}`, { birthDate: "2020-01-01" }),
      400,
      "ANIMAL_INVALID_DATES",
    );
    await expectError(
      await request("PUT", `/${child.id}`, { birthDate: "2009-01-01" }),
      400,
      "ANIMAL_INVALID_DATES",
    );
    for (const birthDate of [
      "2099-01-01",
      "2023-02-29",
      "2020-01-01T00:00:00Z",
    ]) {
      await expectError(
        await request("PUT", `/${child.id}`, { birthDate }),
        400,
      );
    }
  });

  test("blocks deletion and species/sex changes with descendants or historical references", async () => {
    const mother = await create();
    await create({ motherId: mother.id });
    await expectError(
      await request("DELETE", `/${mother.id}`),
      409,
      "ANIMAL_IN_USE",
    );
    await expectError(
      await request("PUT", `/${mother.id}`, { sex: "MALE" }),
      409,
      "ANIMAL_IN_USE",
    );
    const animal = await create();
    repo.referenced.add(animal.id);
    await expectError(
      await request("DELETE", `/${animal.id}`),
      409,
      "ANIMAL_IN_USE",
    );
    const species2 = randomUUID();
    repo.species.set(species2, owner);
    await expectError(
      await request("PUT", `/${animal.id}`, { speciesId: species2 }),
      409,
      "ANIMAL_IN_USE",
    );
    const free = await create();
    expect(
      (
        await request("PUT", `/${free.id}`, {
          sex: "MALE",
          speciesId: species2,
        })
      ).status,
    ).toBe(200);
  });

  test("validates exits and clears exit date when returning to active", async () => {
    const animal = await create({ birthDate: "2020-01-01" });
    await expectError(
      await request("PUT", `/${animal.id}`, { exitDate: "2021-01-01" }),
      400,
    );
    await expectError(
      await request("PUT", `/${animal.id}`, {
        status: "SOLD",
        exitDate: "2019-01-01",
      }),
      400,
    );
    const sold = await request("PUT", `/${animal.id}`, {
      status: "SOLD",
      exitDate: "2021-01-01",
    });
    expect(await sold.json()).toMatchObject({
      status: "SOLD",
      exitDate: "2021-01-01",
    });
    const active = await request("PUT", `/${animal.id}`, { status: "ACTIVE" });
    expect(await active.json()).toMatchObject({
      status: "ACTIVE",
      exitDate: null,
    });
  });

  test("filters and paginates owned animals; children include all states", async () => {
    const mother = await create({ code: "M" });
    const first = await create({
      code: "A",
      crotal: "TAG",
      motherId: mother.id,
    });
    await create({ code: "B", motherId: mother.id, status: "SOLD" });
    await create({ code: "OTHER", speciesId: otherSpeciesId }, otherToken);
    const list = animalPageResponseSchema.parse(
      await (await request("GET", "?limit=1")).json(),
    );
    expect(list.total).toBe(2);
    expect(list.animals.map((a) => a.id)).toEqual([first.id]);
    const all = animalPageResponseSchema.parse(
      await (await request("GET", "?status=ALL")).json(),
    );
    expect(all.total).toBe(3);
    const found = animalPageResponseSchema.parse(
      await (
        await request("GET", `?search=tag&speciesId=${speciesId}&sex=FEMALE`)
      ).json(),
    );
    expect(found.total).toBe(1);
    const children = animalPageResponseSchema.parse(
      await (
        await request("GET", `/${mother.id}/children?limit=1&offset=1`)
      ).json(),
    );
    expect(children.total).toBe(2);
    expect(children.animals[0].status).toBe("SOLD");
  });

  test("rejects invalid query values, empty updates and client-owned internal fields", async () => {
    const animal = await create();
    for (const body of [
      {},
      { isFounder: true },
      { userId: other },
      { code: null },
      { sex: "UNKNOWN" },
      { createdAt: new Date().toISOString() },
    ]) {
      await expectError(await request("PUT", `/${animal.id}`, body), 400);
    }
    for (const query of [
      "limit=101",
      "offset=-1",
      "status=invalid",
      "sex=UNKNOWN",
      "limit=abc",
    ]) {
      await expectError(await request("GET", `?${query}`), 400);
    }
  });

  test("OpenAPI describes the active operations and date-only contracts", () => {
    const registry = new OpenAPIRegistry();
    registerAnimalsRoutes(registry, { name: "bearerAuth" });
    const doc = new OpenApiGeneratorV3(registry.definitions).generateDocument({
      openapi: "3.0.0",
      info: { title: "Animal", version: "1" },
    });
    expect(Object.keys(doc.paths)).toEqual([
      "/api/animals",
      "/api/animals/{id}",
      "/api/animals/{id}/children",
    ]);
    expect(JSON.stringify(doc)).toContain('"format":"date"');
    expect(doc.paths["/api/animals/{id}"]?.delete?.responses).toHaveProperty(
      "409",
    );
  });
});
