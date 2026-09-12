# Ayllu Gen Backend - Agent Guidelines

Reviewed 2026-09-05 against the current code. See [README](README.md) and [Local-First](docs/LOCAL_FIRST.md).

## Essential Commands

### Build & Development

- `npm run dev` - Start development server with hot reload (nodemon)
- `npm run build` - Compile TypeScript to `dist/` directory
- `npm start` - Run `node dist`, compiled entry from `src/index.ts`

### Code Quality

- `npm run lint` - Run ESLint on TypeScript files in `src/`
- `npm run format` - Format code with Prettier (`src/**/*.ts`)

### Testing

- `npm test` - Run all Jest tests
- `jest path/to/file.test.ts` - Run a single test file
- `jest -t "testName"` - Run tests matching a pattern
- `npm run test:unit` - Run unit tests (tests/unit)
- `npm run test:integration` - Run integration tests (tests/integration)

### Database

- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run migrations in dev
- `npm run prisma:push` exists, but must not replace SQL migrations for persistent sync databases (triggers/constraints are required).
- `npx prisma migrate deploy` - Apply existing migrations to an authorized destination after backup/preflight.
- `npm run prisma:studio` - Open Prisma Studio UI

## Modular Clean Architecture

Species is the first shared hexagonal module: `packages/core/src/species` owns Domain and individual Application use cases/ports. API owns Prisma adapters, HTTP projection and `modules/species/bootstrap.ts`. Shared code must not import apps, Prisma, Watermelon, Express or Inversify. See `../../packages/core/src/species/README.md`; existing DI infrastructure remains outside that core.

Install workspace dependencies with pnpm from the monorepo root. Run `pnpm build:shared` before direct typecheck/test commands. Species sync uses shared canonical rules, not one CRUD command per pushed row.

Import concrete public entries such as `@ayllugen/core/species/create`, `/entity`, `/errors`, `/repository`, `/unit-of-work`, `/types`, and `/inputs`; use `import type` for ports and data types. Pure rules use `/rules` and schemas use `@ayllugen/contracts/species`. Do not import `@ayllugen/core/species`, package roots or internal `dist` paths. Core/contracts have no barrels or re-export facades; module internals import concrete files.

This project uses **Modular Clean Architecture** where each feature is a self-contained module with all layers:

```
src/modules/{module-name}/
├── domain/            # Core business logic (entities, repository interfaces)
├── application/       # Use cases, business logic, Zod schemas
├── infrastructure/    # Technical implementations (repositories)
└── presentation/      # HTTP layer (controllers, routes)
```

Current modules: user, auth, species, animal, breeding, health, production, sync

## Creating a New Module

1. Create module structure: `src/modules/{module-name}/{domain,application,infrastructure,presentation}/{entities,repositories,services,schemas,controllers,routes}`
2. Implement domain layer (entities, repository interfaces)
3. Implement application layer (services, Zod schemas)
4. Implement infrastructure layer (repository implementations)
5. Implement presentation layer (controllers, routes)
6. Register routes in `src/presentation/routes/index.ts`

## Naming Conventions

### Files & Directories

- Entities: `{EntityName}.ts` (PascalCase) - `User.ts`
- Repository Interfaces: `I{EntityName}Repository.ts` - `IUserRepository.ts`
- Repository Implementations: `{EntityName}Repository.ts` - `UserRepository.ts`
- Services: `{ModuleName}Service.ts` - `UserService.ts`
- Controllers: `{ModuleName}Controller.ts` - `UserController.ts`
- Routes: `{moduleName}.routes.ts` (kebab-case) - `user.routes.ts`
- Schemas: `{moduleName}.schema.ts` - `user.schema.ts`

### Code Elements

- Classes/Interfaces: PascalCase (`UserService`, `IUserRepository`)
- Functions/Methods: camelCase (`findById`, `createUser`)
- Variables: camelCase (`userId`, `userRepository`)
- Constants: SCREAMING_SNAKE_CASE (`TYPE_IUserRepository`, `API_BASE_URL`)
- Types (Zod inferred): PascalCase (`UserCreateInput`, `UserResponse`)

### Method Names

- CRUD: `findById()`, `findAll()`, `create()`, `update()`, `delete()`
- Search: `findBy{Field}()`, `findActive()`
- Business: `processPayment()`, `generateReport()`

## TypeScript & Imports

- Strict mode enabled: noImplicitAny, noUnusedLocals, noUnusedParameters
- Preserve existing file formatting; use project Prettier (many backend files use double quotes).
- Path aliases: `@domain/*`, `@application/*`, `@infrastructure/*`, `@presentation/*`, `@shared/*`
- Cross-module imports: use relative paths (e.g., `../../../user/infrastructure/repositories/UserRepository`)

## Dependency Injection

- Use InversifyJS for DI
- All services/controllers: add `@injectable()` decorator
- Inject dependencies: `@inject(TYPE_IUserRepository) private userRepository: IUserRepository`
- Match existing DI bindings: business modules use `TYPES` from shared/di; Watermelon uses `TYPE_IWatermelonRepository` plus class bindings. Do not invent a different token for an existing binding.

## Zod Schemas (No DTOs)

Use only Zod schemas with inferred types:

```typescript
export const registerSchema = z.object({
  dni: z.string().length(8).describe("Numero de dni"),
  password: z.string().min(6).describe("Contraseña"),
});
export type RegisterInput = z.infer<typeof registerSchema>;
```

- Add `.describe()` for documentation in spanish
- Use `.openapi()` with `.example()` for Swagger
- Export inferred types for use in services/controllers

## Error Handling

**DO NOT use try-catch in controllers** - errors are handled by `asyncHandler`

Use custom error classes from `src/shared/errors/AppError`:

- `ConflictError` (409) - Duplicate resources
- `AuthenticationError` (401) - Failed auth (login, token)
- `NotFoundError` (404) - Resource not found
- `ValidationError` (400) - General validation failures

Wrap route handlers: `router.post('/register', validate(registerSchema), asyncHandler(authController.register))`

## Repository Pattern

- Implement domain interfaces in infrastructure layer
- Methods return `Promise<T | null>` for optional results
- Use Prisma client from `src/infrastructure/database/prisma/client`
- Auth still uses mutable `setTransactionClient()` on singleton repositories; this is concurrency debt, not a pattern for new code. Sync v2 uses a session per transaction.
- CRUD operations: `findById`, `create`, `update`, `delete`

## Authentication

- JWT for access tokens (default 15min expiry)
- Refresh tokens for sessions (default 7 days)
- Hash passwords with bcrypt (10 salt rounds)
- Auth middleware validates JWT from `Authorization: Bearer` header

## Controllers

- Use arrow functions: `create = asyncHandler(async (req, res) => { ... })`
- Structure: validate → process → return response
- Use correct HTTP codes: 200, 201, 204, 400, 401, 404, 409
- No business logic - delegate to services

## Testing

- Tests located in `tests/` directory
- Use `jest path/to/file.test.ts` to run single test
- Test setup: `tests/setup.ts`
- Timeout: 10000ms

## Formatting

- 2-space indentation
- Semicolons consistently
- No trailing whitespace
- No console.log or debugger in production code

## Prisma Models

- Use `@@map("table_name")` for custom table names
- Define cascade/SetNull/restrict behavior according to the relationship; preserve sync triggers and tombstones.
- UUID primary keys with `@default(uuid())`
- Include `createdAt` and `updatedAt` timestamps

## Sync and compatibility

- POST /api/sync/v2/pull accepts only schema 7 and migration null. Push is atomic and returns 204. All five entities' native created_at/updated_at are required and map directly to Prisma clientCreatedAt/clientUpdatedAt both ways. No old date aliases or fallback to server time. Server audit/checkpoints remain independent.
- Checkpoints are monotonic per-owner counters, not wall-clock timestamps. Pull uses a consistent snapshot.
- Derive owner from JWT; whitelist tables/columns and validate final relationships and conflicts.
- Business REST endpoints remain. The old queue endpoints, service, repository, schemas and SyncLog are removed. Do not restore legacy compatibility. None of the five synchronized business entities stores syncStatus/syncVersion; tracking belongs only to Watermelon internals and server clocks/records/receipts.
- Never purge tombstones/receipts without a checkpoint expiry and safe rebootstrap protocol.
- General rate limiting is not currently mounted; authLimiter is mounted for register/login/logout. Do not document blanket rate limiting.
- OpenAPI does not yet register species. Route registration does not automatically update Swagger.
- Integration cases need SYNC_TEST_DATABASE_URL pointing to isolated sync_test, never production. SQL migrations install required triggers/constraints; retain that history even though mobile historical migrations are removed.
