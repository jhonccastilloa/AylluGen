const { test } = require('node:test');
const assert = require('node:assert/strict');
const { speciesFieldsSchema, createSpeciesInputSchema, updateSpeciesInputSchema } = require('@ayllugen/contracts/species');
const { Species } = require('@ayllugen/core/species/entity');
const { SpeciesCode } = require('@ayllugen/core/species/code');
const valid = { code: 'ALPACA', name: 'Alpaca', description: null };

test('wire validation does not normalize stored text', () => {
  const record = { ...valid, name: ' Alpaca ', description: '' };
  assert.deepEqual(speciesFieldsSchema.parse(record), record);
  assert.equal(speciesFieldsSchema.safeParse({ ...valid, code: 'alpaca' }).success, false);
});
test('commands defer normalization to the domain and support explicit clearing', () => {
  const input = createSpeciesInputSchema.parse({ code: ' alpaca ', name: ' Alpaca ' });
  assert.equal(input.code, ' alpaca ');
  const species = Species.create({ ...input, description: input.description ?? null, id: 'id', userId: 'owner' });
  assert.equal(species.code, 'ALPACA');
  assert.deepEqual(updateSpeciesInputSchema.parse({ description: null }), { description: null });
  assert.equal(updateSpeciesInputSchema.safeParse({}).success, false);
});
test('canonical validation covers shared field limits and types', () => {
  for (const fields of [
    { ...valid, code: 'A' }, { ...valid, code: 'A'.repeat(31) },
    { ...valid, name: 'A' }, { ...valid, name: 'A'.repeat(81) },
    { ...valid, name: '  ' }, { ...valid, name: ' A ' },
    { ...valid, description: 'A'.repeat(201) }, { ...valid, description: 42 },
  ]) assert.equal(speciesFieldsSchema.safeParse(fields).success, false);
  assert.equal(speciesFieldsSchema.safeParse(valid).success, true);
});

test('wire code validation agrees with the domain code value object', () => {
  for (const code of ['A', 'A'.repeat(30), 'A'.repeat(31), 'alpaca', 'ALPACA_']) {
    let domainAccepts = true;
    try {
      SpeciesCode.restore(code);
    } catch {
      domainAccepts = false;
    }
    assert.equal(speciesFieldsSchema.safeParse({ ...valid, code }).success, domainAccepts, code);
  }
});
