const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { Species } = require("@ayllugen/core/species/entity");
const { SpeciesError } = require("@ayllugen/core/species/errors");
const { CreateSpecies } = require("@ayllugen/core/species/create");
const { UpdateSpecies } = require("@ayllugen/core/species/update");
const { DeleteSpecies } = require("@ayllugen/core/species/delete");
const { ListSpecies } = require("@ayllugen/core/species/list");
const { GetSpecies } = require("@ayllugen/core/species/get");
const { ResolveSpeciesByCode } = require("@ayllugen/core/species/resolve-by-code");
const { InitializeSpeciesCatalog } = require("@ayllugen/core/species/initialize-catalog");
const {
  assertSpeciesUnused,
} = require("@ayllugen/core/species/deletion-policy");

function fixture() {
  const rows = new Map();
  const used = new Set();
  let nextId = 0;
  let writes = 0;
  let timestamp = 1000;
  let tail = Promise.resolve();
  const session = (owner) => {
    const owned = () =>
      [...rows.values()].filter((row) => row.userId === owner);
    return {
      species: {
        list: async () => owned().sort((a, b) => a.name.localeCompare(b.name)),
        findById: async (id) => owned().find((row) => row.id === id) ?? null,
        findByCode: async (code) =>
          owned().find((row) => row.code === code) ?? null,
        findConflict: async (fields, except) => {
          const others = owned().filter((row) => row.id !== except);
          if (others.some((row) => row.code === fields.code)) return "code";
          return others.some((row) => row.name === fields.name) ? "name" : null;
        },
        insert: async (id, fields) => {
          const row = {
            ...fields,
            id,
            userId: owner,
            clientCreatedAt: new Date(timestamp),
            clientUpdatedAt: new Date(timestamp++),
          };
          rows.set(id, row);
          writes++;
          return row;
        },
        update: async (id, fields) => {
          const row = {
            ...rows.get(id),
            ...fields,
            clientUpdatedAt: new Date(timestamp++),
          };
          rows.set(id, row);
          writes++;
          return row;
        },
        delete: async (id) => {
          rows.delete(id);
          writes++;
        },
      },
      usage: { hasAnimals: async (id) => used.has(id) },
    };
  };
  const unit = {
    read: async (owner, work) => work(session(owner)),
    write: (owner, work) => {
      const result = tail.then(() => work(session(owner)));
      tail = result.catch(() => {});
      return result;
    },
  };
  const commands = (owner) => {
    const list = new ListSpecies(unit, owner);
    const resolve = new ResolveSpeciesByCode(
      unit,
      owner,
      () => `id-${++nextId}`,
    );
    return {
      create: new CreateSpecies(unit, owner, () => `id-${++nextId}`),
      update: new UpdateSpecies(unit, owner),
      delete: new DeleteSpecies(unit, owner),
      list,
      get: new GetSpecies(unit, owner),
      resolve,
      initialize: new InitializeSpeciesCatalog(list, resolve),
    };
  };
  return {
    rows,
    used,
    commands,
    get writes() {
      return writes;
    },
  };
}
const valid = { code: "ALPACA", name: "Alpaca", description: "Andina" };
const errorCode = (code) => (error) =>
  error instanceof SpeciesError && error.code === code;

test("entity normalizes commands and protects its identity from primitive mutations", () => {
  const species = Species.create({
    ...valid,
    id: "a",
    userId: "owner",
    code: " alpaca andina ",
    name: " Alpaca ",
    description: " ",
  });
  assert.equal(species.code, "ALPACA_ANDINA");
  assert.equal(species.description, null);
  const copy = species.toPrimitives();
  copy.name = "Changed";
  assert.equal(species.name, "Alpaca");
  species.changeDetails({ description: " Hola " });
  assert.equal(species.description, "Hola");
  assert.equal(species.id, "a");
  assert.throws(
    () => Species.create({ ...valid, id: "b", userId: "owner", code: "!" }),
    (error) => errorCode("SPECIES_INVALID")(error) && error.field === "code",
  );
  assert.throws(
    () => Species.create({ ...valid, id: "c", userId: "owner", name: " " }),
    (error) => errorCode("SPECIES_INVALID")(error) && error.field === "name",
  );
});

test("restore neither normalizes historical strings nor copies audit data into entity", () => {
  const species = Species.restore({
    ...valid,
    id: "a",
    userId: "owner",
    name: " Alpaca ",
    updatedAt: 100,
  });
  assert.equal(species.name, " Alpaca ");
  assert.equal("updatedAt" in species.toPrimitives(), false);
});

test("partial edits preserve the exact stored values of omitted fields", () => {
  const species = Species.restore({
    ...valid,
    id: "a",
    userId: "owner",
    name: " Alpaca ",
    description: " Andina ",
  });
  species.changeDetails({ code: "llama" });
  assert.deepEqual(species.toPrimitives(), {
    id: "a",
    userId: "owner",
    code: "LLAMA",
    name: " Alpaca ",
    description: " Andina ",
  });
  species.changeDetails({ name: " Vicuña " });
  assert.equal(species.name, "Vicuña");
  assert.equal(species.description, " Andina ");
});

test("create and restore reject invalid identity or stored values", () => {
  for (const method of [Species.create, Species.restore]) {
    for (const [field, value] of [["id", "  "], ["userId", ""]]) {
      assert.throws(
        () => method({ ...valid, id: "a", userId: "owner", [field]: value }),
        (error) => errorCode("SPECIES_INVALID")(error) && error.field === field,
      );
    }
  }
  for (const [field, value] of [
    ["code", "alpaca"],
    ["name", "  "],
    ["description", "x".repeat(201)],
  ]) {
    assert.throws(
      () => Species.restore({ ...valid, id: "a", userId: "owner", [field]: value }),
      (error) => errorCode("SPECIES_INVALID")(error) && error.field === field,
    );
  }
});

test("list is read-only and does not seed defaults", async () => {
  const f = fixture();
  assert.deepEqual(await f.commands("a").list.execute(), []);
  assert.equal(f.writes, 0);
});

test("create and update normalize the same fields and retain origin creation", async () => {
  const commands = fixture().commands("a");
  const created = await commands.create.execute({
    ...valid,
    code: " alpaca ",
    name: " Alpaca ",
  });
  const updated = await commands.update.execute(created.id, {
    name: " Andina ",
  });
  assert.equal(updated.code, "ALPACA");
  assert.equal(updated.name, "Andina");
  assert.equal(updated.description, "Andina");
  assert.deepEqual(updated.clientCreatedAt, created.clientCreatedAt);
  assert.ok(updated.clientUpdatedAt > created.clientUpdatedAt);
});

test("omitted description preserves it; empty, whitespace and null clear it", async () => {
  for (const value of ["", "  ", null]) {
    const commands = fixture().commands("a");
    const created = await commands.create.execute(valid);
    const updated = await commands.update.execute(created.id, {
      description: value,
    });
    assert.equal(updated.description, null);
  }
});

test("invalid commands never write", async () => {
  for (const input of [
    { ...valid, code: "!!" },
    { ...valid, name: "  " },
    { ...valid, description: "x".repeat(201) },
  ]) {
    const f = fixture();
    await assert.rejects(
      async () => f.commands("a").create.execute(input),
      errorCode("SPECIES_INVALID"),
    );
    assert.equal(f.writes, 0);
  }
});

test("code and name duplicates are reported with fields, scoped per owner", async () => {
  const f = fixture();
  const commands = f.commands("a");
  await commands.create.execute(valid);
  await assert.rejects(
    commands.create.execute({ ...valid, name: "Other" }),
    (error) => error.field === "code",
  );
  await assert.rejects(
    commands.create.execute({ ...valid, code: "OTHER" }),
    (error) => error.field === "name",
  );
  await f.commands("b").create.execute(valid);
  assert.equal(f.rows.size, 2);
});

test("update excludes itself but cannot collide with another species", async () => {
  const commands = fixture().commands("a");
  const first = await commands.create.execute(valid);
  await commands.update.execute(first.id, { code: "alpaca" });
  const second = await commands.create.execute({
    code: "LLAMA",
    name: "Llama",
  });
  await assert.rejects(
    commands.update.execute(second.id, { code: "ALPACA" }),
    errorCode("SPECIES_DUPLICATE"),
  );
  assert.equal((await commands.get.execute(second.id)).code, "LLAMA");
  await assert.rejects(
    commands.update.execute(first.id, {}),
    errorCode("SPECIES_INVALID"),
  );
});

test("concurrent creates validate within the unit of work", async () => {
  const f = fixture();
  const commands = f.commands("a");
  const results = await Promise.allSettled([
    commands.create.execute(valid),
    commands.create.execute(valid),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(f.writes, 1);
});

test("linked animals prevent delete; unused species can be removed", async () => {
  const f = fixture();
  const commands = f.commands("a");
  const created = await commands.create.execute(valid);
  f.used.add(created.id);
  await assert.rejects(
    commands.delete.execute(created.id),
    errorCode("SPECIES_IN_USE"),
  );
  assert.equal(f.writes, 1);
  f.used.delete(created.id);
  await commands.delete.execute(created.id);
  await assert.rejects(
    commands.get.execute(created.id),
    errorCode("SPECIES_NOT_FOUND"),
  );
});

test("another account cannot read, update or delete a species", async () => {
  const f = fixture();
  const created = await f.commands("a").create.execute(valid);
  const other = f.commands("b");
  for (const work of [
    () => other.get.execute(created.id),
    () => other.update.execute(created.id, { name: "Other" }),
    () => other.delete.execute(created.id),
  ])
    await assert.rejects(work(), errorCode("SPECIES_NOT_FOUND"));
  assert.equal(f.writes, 1);
});

test("default initialization and resolve are explicit and repeatable", async () => {
  const f = fixture();
  const commands = f.commands("a");
  await commands.initialize.execute([valid, { code: "LLAMA", name: "Llama" }]);
  await commands.initialize.execute([valid]);
  const found = await commands.resolve.execute({ ...valid, code: "alpaca" });
  assert.equal(found.code, "ALPACA");
  assert.equal(f.writes, 2);
});

test("sync can use the deletion rule against its final batch state", () => {
  assert.throws(() => assertSpeciesUnused(true), errorCode("SPECIES_IN_USE"));
  assertSpeciesUnused(false);
});

test("domain and application import no frameworks, adapters or contracts", () => {
  for (const layer of ["domain", "application"]) {
    const root = path.resolve(__dirname, "../src/species", layer);
    const walk = (directory) =>
      fs
        .readdirSync(directory, { withFileTypes: true })
        .flatMap((entry) =>
          entry.isDirectory()
            ? walk(path.join(directory, entry.name))
            : [path.join(directory, entry.name)],
        );
    for (const file of walk(root)) {
      const code = fs.readFileSync(file, "utf8");
      assert.doesNotMatch(
        code,
        /from\s+['"](?:@|node:|react|zod|inversify|.*infrastructure|.*contracts)/,
        file,
      );
    }
  }
});
