const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);

test('shared packages have one root toolchain and no module-level configuration', () => {
  assert.ok(readJson('package.json').devDependencies.typescript);
  for (const name of ['core', 'contracts']) {
    const manifest = readJson(`packages/${name}/package.json`);
    assert.equal(manifest.name, `@ayllugen/${name}`);
    assert.equal(manifest.devDependencies, undefined);
    assert.equal(manifest.scripts, undefined);
    const config = readJson(`packages/${name}/tsconfig.json`);
    assert.equal(config.extends, '../../tsconfig.packages.base.json');
    assert.equal(config.compilerOptions.rootDir, 'src');
    assert.equal(config.compilerOptions.outDir, 'dist');
    assert.equal(fs.existsSync(path.join(root, `packages/${name}/.gitignore`)), false);
  }
  for (const file of walk(path.join(root, 'packages/core/src'))) {
    assert.doesNotMatch(path.basename(file), /^(?:package\.json|tsconfig.*\.json|\.gitignore)$/);
  }
  assert.deepEqual(readJson('tsconfig.packages.json').references, [
    { path: './packages/core' }, { path: './packages/contracts' },
  ]);
  assert.deepEqual(readJson('packages/contracts/tsconfig.json').references, [{ path: '../core' }]);
});

test('all core source imports stay within core, without runtime libraries', () => {
  const manifest = readJson('packages/core/package.json');
  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies'])
    assert.deepEqual(manifest[field] ?? {}, {});
  const sourceRoot = path.join(root, 'packages/core/src');
  const checkImport = (specifier, file) => {
    assert.ok(specifier.startsWith('.'), `${file}: external dependency ${specifier}`);
    const resolved = path.resolve(path.dirname(file), specifier);
    assert.ok(resolved.startsWith(sourceRoot + path.sep), `${file}: escapes the core boundary`);
  };
  for (const file of walk(sourceRoot).filter(file => file.endsWith('.ts'))) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const visit = node => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier)
        checkImport(node.moduleSpecifier.text, file);
      if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference))
        checkImport(node.moduleReference.expression.text, file);
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
        assert.equal(node.arguments.length, 1, `${file}: indirect imports are not allowed`);
        assert.ok(ts.isStringLiteral(node.arguments[0]), `${file}: dynamic imports must be static`);
        checkImport(node.arguments[0].text, file);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
});

test('apps and contracts resolve the same concrete public files', () => {
  const api = createRequire(path.join(root, 'apps/api/package.json'));
  const mobile = createRequire(path.join(root, 'apps/mobile/package.json'));
  const contracts = createRequire(path.join(root, 'packages/contracts/package.json'));
  const manifest = readJson('packages/core/package.json');
  const runtimeEntries = {
    entity: 'Species', errors: 'SpeciesError', create: 'CreateSpecies',
    update: 'UpdateSpecies', delete: 'DeleteSpecies', list: 'ListSpecies',
    get: 'GetSpecies', 'resolve-by-code': 'ResolveSpeciesByCode',
    'initialize-catalog': 'InitializeSpeciesCatalog', rules: 'speciesCodeIssue',
  };
  for (const consumer of [api, mobile, contracts]) {
    for (const [entry, name] of Object.entries(runtimeEntries)) {
      const specifier = `@ayllugen/core/species/${entry}`;
      const expected = path.join(root, 'packages/core', manifest.exports[`./species/${entry}`].default);
      assert.equal(fs.realpathSync(consumer.resolve(specifier)), fs.realpathSync(expected));
      assert.equal(typeof consumer(specifier)[name], 'function', name);
    }
  }
  assert.equal(api('@ayllugen/core/species/entity').Species, mobile('@ayllugen/core/species/entity').Species);
  for (const consumer of [api, mobile]) {
    assert.equal(typeof consumer('@ayllugen/contracts/species').speciesFieldsSchema.parse, 'function');
    assert.equal(typeof consumer('@ayllugen/core/species/rules').speciesCodeIssue, 'function');
    for (const specifier of ['@ayllugen/core', '@ayllugen/contracts', '@ayllugen/core/species',
      '@ayllugen/core/dist/species/domain/entities/Species',
      '@ayllugen/core/species/domain/entities/Species', '@ayllugen/contracts/dist/species']) {
      assert.throws(() => consumer(specifier), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' }, specifier);
    }
  }
  assert.deepEqual(readJson('packages/contracts/package.json').dependencies, {
    '@ayllugen/core': 'workspace:*', zod: '^4.3.6',
  });
});

test('subpath exports and TypeScript declarations agree for both app resolvers', () => {
  for (const [name, entries] of [
    ['core', ['entity', 'errors', 'types', 'rules', 'repository', 'usage', 'unit-of-work',
      'inputs', 'create', 'update', 'delete', 'list', 'get', 'resolve-by-code',
      'initialize-catalog'].map(entry => `./species/${entry}`)],
    ['contracts', ['./species']],
  ]) {
    const manifest = readJson(`packages/${name}/package.json`);
    assert.deepEqual(Object.keys(manifest.exports), entries);
    assert.equal(manifest.main, undefined);
    assert.equal(manifest.types, undefined);
    for (const entry of ['src/index.ts', 'dist/index.js', 'dist/index.d.ts'])
      assert.equal(fs.existsSync(path.join(root, `packages/${name}`, entry)), false);
    for (const directory of ['src', 'dist'])
      for (const file of walk(path.join(root, `packages/${name}`, directory)))
        assert.doesNotMatch(path.basename(file), /^index\.(?:ts|js|d\.ts)$/, 'No leftover barrel outputs');
    for (const entry of entries) {
      const subpath = entry.slice(2);
      const expected = path.join(root, `packages/${name}`, manifest.exports[entry].types);
      assert.deepEqual(manifest.typesVersions['*'][subpath], [manifest.exports[entry].types.slice(2)]);
      for (const options of [
        { moduleResolution: ts.ModuleResolutionKind.Node10, module: ts.ModuleKind.CommonJS },
        { moduleResolution: ts.ModuleResolutionKind.Bundler, module: ts.ModuleKind.ESNext },
      ]) {
        for (const app of ['api', 'mobile']) {
          const resolved = ts.resolveModuleName(`@ayllugen/${name}/${subpath}`,
            path.join(root, `apps/${app}/src/__resolution_check__.ts`), options, ts.sys).resolvedModule;
          assert.ok(resolved, `${name}/${subpath} in ${app}`);
          assert.equal(fs.realpathSync(resolved.resolvedFileName), fs.realpathSync(expected));
        }
      }
    }
  }
});

test('shared sources export their own declarations without barrels or re-export facades', () => {
  for (const name of ['core', 'contracts']) {
    for (const file of walk(path.join(root, `packages/${name}/src`)).filter(file => file.endsWith('.ts'))) {
      assert.notEqual(path.basename(file), 'index.ts', 'No shared barrels');
      const code = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
      for (const node of code.statements) {
        assert.ok(!ts.isExportDeclaration(node), `${file}: export declarations where they are defined`);
        if (ts.isImportDeclaration(node) && node.moduleSpecifier && node.moduleSpecifier.text.startsWith('.')) {
          const target = path.resolve(path.dirname(file), node.moduleSpecifier.text);
          assert.ok(fs.existsSync(target + '.ts'), `${file}: import concrete source files`);
          assert.notEqual(path.basename(target), 'index', `${file}: do not import a barrel`);
        }
      }
    }
  }
});

const loadedCoreModules = specifier => JSON.parse(execFileSync(process.execPath, ['-e', `
  const path = require('node:path');
  const { createRequire } = require('node:module');
  const consumer = createRequire(path.resolve('apps/api/package.json'));
  consumer(process.argv[1]);
  process.stdout.write(JSON.stringify(Object.keys(require.cache)
    .map(file => path.relative(process.cwd(), file).split(path.sep).join('/'))
    .filter(file => file.startsWith('packages/core/dist/'))));
`, specifier], { cwd: root, encoding: 'utf8' }));

test('rules and contracts load no Species barrel or application use cases', () => {
  for (const specifier of ['@ayllugen/core/species/rules', '@ayllugen/contracts/species']) {
    const loaded = loadedCoreModules(specifier);
    assert.ok(loaded.includes('packages/core/dist/species/domain/services/SpeciesRules.js'));
    assert.ok(loaded.every(file => file.startsWith('packages/core/dist/species/domain/')), loaded.join('\n'));
  }
});

test('loading CreateSpecies loads only its dependencies, not other use cases or type stubs', () => {
  const loaded = loadedCoreModules('@ayllugen/core/species/create');
  assert.ok(loaded.includes('packages/core/dist/species/application/use-cases/CreateSpecies.js'));
  for (const file of loaded)
    assert.doesNotMatch(file, /\/ports\/|\/domain\/types\/|\/inputs\.js$|\/index\.js$/);
  assert.deepEqual(loaded.filter(file => file.includes('/application/use-cases/')).sort(), [
    'packages/core/dist/species/application/use-cases/CreateSpecies.js',
    'packages/core/dist/species/application/use-cases/requireSpecies.js',
  ]);
});

test('type-only consumers emit no runtime imports', () => {
  const source = `
    import type { SpeciesData, SpeciesFields, SpeciesProps } from '@ayllugen/core/species/types';
    import type { SpeciesErrorCode } from '@ayllugen/core/species/errors';
    import type { SpeciesRepository } from '@ayllugen/core/species/repository';
    import type { SpeciesUsage } from '@ayllugen/core/species/usage';
    import type { SpeciesUnitOfWork, SpeciesSession, SpeciesIdGenerator } from '@ayllugen/core/species/unit-of-work';
    import type { CreateSpeciesInput, UpdateSpeciesInput } from '@ayllugen/core/species/inputs';
    export type Contract = [SpeciesData, SpeciesFields, SpeciesProps, SpeciesErrorCode,
      SpeciesRepository, SpeciesUsage, SpeciesUnitOfWork, SpeciesSession, SpeciesIdGenerator,
      CreateSpeciesInput, UpdateSpeciesInput];
  `;
  const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  assert.doesNotMatch(result.outputText, /require\(|@ayllugen/);
});

test('mobile and backend keep their own TypeScript configurations', () => {
  assert.equal(readJson('apps/mobile/tsconfig.json').extends, '@react-native/typescript-config');
  assert.equal(readJson('apps/api/tsconfig.json').extends, undefined);
});
