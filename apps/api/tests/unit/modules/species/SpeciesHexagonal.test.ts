import { SpeciesError } from "@ayllugen/core/species/errors";
import { CreateSpecies } from "@ayllugen/core/species/create";
import { prisma } from "../../../../src/infrastructure/database/prisma/client";
import { PrismaSpeciesRepository } from "../../../../src/modules/species/infrastructure/repositories/PrismaSpeciesRepository";
import { SpeciesService } from "../../../../src/modules/species/application/services/SpeciesService";
import { createSpeciesUseCases } from "../../../../src/modules/species/bootstrap";
import { speciesCreateSchema } from "../../../../src/modules/species/application/schemas/species.schema";
import { recordSchemas } from "../../../../src/modules/sync/application/schemas/watermelon.schema";

const OWNER = "11111111-1111-4111-8111-111111111111";
const origin = new Date("2026-09-01T10:00:00.123Z");
const audit = new Date("2026-09-08T11:00:00.456Z");
const record = {
  id: "22222222-2222-4222-8222-222222222222",
  userId: OWNER,
  code: "ALPACA",
  name: "Alpaca",
  description: "Andina",
  clientCreatedAt: origin,
  clientUpdatedAt: origin,
  createdAt: audit,
  updatedAt: audit,
  deletedAt: null,
};

function fixture() {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ version: 1n }]),
    species: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(record),
      create: jest
        .fn()
        .mockImplementation(async ({ data }) => ({ ...record, ...data })),
      update: jest
        .fn()
        .mockImplementation(async ({ data }) => ({ ...record, ...data })),
    },
    animal: { count: jest.fn().mockResolvedValue(0) },
  };
  (prisma.$transaction as jest.Mock).mockImplementation(async (work) =>
    work(tx),
  );
  Object.assign(prisma, { species: tx.species, animal: tx.animal });
  const repository = new PrismaSpeciesRepository(OWNER);
  const api = new SpeciesService((owner) =>
    createSpeciesUseCases(new PrismaSpeciesRepository(owner)),
  );
  return { tx, api, repository };
}

beforeEach(() => jest.clearAllMocks());

it("normalizes a REST command through the shared entity, in an owner-locked transaction", async () => {
  const { tx, api } = fixture();
  const payload = speciesCreateSchema.parse({
    code: " alpaca ",
    name: " Alpaca ",
    description: " ",
  });
  const result = await api.create(OWNER, payload);
  expect(result).toMatchObject({
    code: "ALPACA",
    name: "Alpaca",
    description: null,
  });
  expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
    tx.species.create.mock.invocationCallOrder[0],
  );
  expect(tx.species.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ userId: OWNER, code: "ALPACA" }),
  });
  expect(result.clientCreatedAt).toBe(origin.toISOString());
  expect(result.createdAt).toBe(audit.toISOString());
  expect(prisma.$transaction).toHaveBeenCalledWith(
    expect.any(Function),
    expect.objectContaining({ isolationLevel: "ReadCommitted" }),
  );
});

it("clears a REST description without changing device creation or server creation", async () => {
  const { tx, api } = fixture();
  const result = await api.update(record.id, OWNER, { description: "" });
  const data = tx.species.update.mock.calls[0][0].data;
  expect(data.description).toBeNull();
  expect(data).not.toHaveProperty("clientCreatedAt");
  expect(data).not.toHaveProperty("createdAt");
  expect(data).not.toHaveProperty("id");
  expect(result.clientCreatedAt).toBe(origin.toISOString());
  expect(result.createdAt).toBe(audit.toISOString());
});

it("omitting description retains it and updates only the intended record/owner", async () => {
  const { tx, api } = fixture();
  const result = await api.update(record.id, OWNER, { name: " Nueva " });
  expect(result.description).toBe("Andina");
  expect(tx.species.update).toHaveBeenCalledWith({
    where: { id: record.id, userId: OWNER, deletedAt: null },
    data: {
      code: "ALPACA",
      name: "Nueva",
      description: "Andina",
      clientUpdatedAt: expect.any(Date),
    },
  });
});

it("rejects an update when the stored species changed after it was read", async () => {
  const { tx, api } = fixture();
  tx.species.findFirst
    .mockResolvedValueOnce(record)
    .mockResolvedValueOnce({ ...record, name: "Changed" });
  await expect(api.update(record.id, OWNER, { description: "Nueva" })).rejects.toMatchObject({
    statusCode: 409,
  });
  expect(tx.species.update).not.toHaveBeenCalled();
});

it("maps duplicate errors to 409 and checks reserved keys without changing the database policy", async () => {
  const { tx, api } = fixture();
  tx.species.findMany.mockResolvedValue([{ code: "ALPACA" }]);
  await expect(
    api.create(OWNER, { code: "ALPACA", name: "Alpaca" }),
  ).rejects.toMatchObject({ statusCode: 409 });
  expect(tx.species.create).not.toHaveBeenCalled();
  expect(tx.species.findMany.mock.calls[0][0].where).not.toHaveProperty(
    "deletedAt",
  );
});

it("linked species fail before mutation, and missing/foreign species return 404", async () => {
  const { tx, api } = fixture();
  tx.animal.count.mockResolvedValue(1);
  await expect(api.delete(record.id, OWNER)).rejects.toMatchObject({
    statusCode: 400,
  });
  expect(tx.species.update).not.toHaveBeenCalled();
  tx.species.findFirst.mockResolvedValue(null);
  await expect(
    api.update(record.id, OWNER, { name: "Other" }),
  ).rejects.toMatchObject({ statusCode: 404 });
  expect(tx.species.findFirst).toHaveBeenCalledWith({
    where: { userId: OWNER, deletedAt: null, id: record.id },
  });
});

it("soft deletes using the owner predicate and never physically deletes", async () => {
  const { tx, api } = fixture();
  await api.delete(record.id, OWNER);
  expect(tx.species.update).toHaveBeenCalledWith({
    where: { id: record.id, userId: OWNER, deletedAt: null },
    data: { deletedAt: expect.any(Date) },
  });
});

it("does not swallow infrastructure failures and translates SQL uniqueness conflicts", async () => {
  const { tx, api } = fixture();
  tx.species.create.mockRejectedValueOnce(new Error("storage unavailable"));
  await expect(
    api.create(OWNER, { code: "ALPACA", name: "Alpaca" }),
  ).rejects.toThrow("storage unavailable");
  tx.species.create.mockRejectedValueOnce({ code: "P2002" });
  await expect(
    api.create(OWNER, { code: "ALPACA", name: "Alpaca" }),
  ).rejects.toMatchObject({ statusCode: 409 });
});

it("keeps the core error free of HTTP status codes", async () => {
  const { repository } = fixture();
  const useCase = new CreateSpecies(repository, () => record.id);
  try {
    await useCase.execute({ code: "!!", name: "Alpaca" });
    throw new Error("expected validation failure");
  } catch (error) {
    expect(error).toBeInstanceOf(SpeciesError);
    expect(error).not.toHaveProperty("statusCode");
  }
});

it("push schemas reuse canonical constraints without normalizing dates or strings", () => {
  const raw = {
    id: record.id,
    code: "ALPACA",
    name: " Alpaca ",
    description: "",
    created_at: 1000,
    updated_at: 2000,
  };
  expect(recordSchemas.species.parse(raw)).toEqual(raw);
  expect(
    recordSchemas.species.safeParse({ ...raw, code: "alpaca" }).success,
  ).toBe(false);
});
