# Repository Guidelines

## Project Structure & Module Organization

`AylluGen` is a React Native + TypeScript Local-First app. Documentation reviewed 2026-09-05.

- `src/core`: shared config, constants, i18n, types, and utilities.
- `src/features`: business pages, UseCases, interfaces and local repositories; container captures DB/sync per account.
- `src/application/services`: authentication service and types.
- `src/infrastructure`: API client/services, repository implementations, theme setup, logger.
- `src/presentation`: UI components and providers.
- `src/store`: auth, loader, network and sync Zustand stores. Theme preferences live in `src/core/theme/themePreferences.ts`.
- `src/shared`: shared UI-adjacent types and utilities (toasts, helpers).
- `__tests__`: App test; most Jest tests are colocated with features/database/API.
- `android/` and `ios/`: native projects.

Use the alias `@/*` for imports from `src` (configured in `tsconfig.json` and Babel).

## Build, Test, and Development Commands

- `npm start`: starts Metro bundler.
- `npm run android`: builds/runs developmentRelease; requires release signing.
- `npx react-native run-android --mode=developmentDebug --appId=com.ayllugen.dev`: debug development build/run.
- `npm run ios`: builds/runs the app on iOS simulator.
- `npm test`: runs Jest tests.
- `npm run lint`: runs ESLint across the repo.
- `npx tsc --noEmit`: TypeScript check.

iOS native deps (first clone or native dependency updates):

- `bundle install`
- `bundle exec pod install` (from `ios/`).

## Coding Style & Naming Conventions

- Language: TypeScript (`.ts`/`.tsx`) for app code.
- Formatting: Prettier (`singleQuote: true`, `trailingComma: all`, `arrowParens: avoid`).
- Linting: ESLint with `@react-native` config (`.eslintrc.js`).
- Components and screens: `PascalCase` file names (`SyncStatusBanner.tsx`).
- React hooks/stores: `camelCase` with `use` prefix (`useSyncStore.ts`). Existing UseCases classes also reside under feature `hooks/`.
- Keep feature contracts in `features/*/interfaces` and shared integrations in `infrastructure`.

## Local-First invariants

- Species, animals, breedings, health and production use WatermelonDB only for UI CRUD. Do not restore REST CRUD adapters or a manual sync queue.
- SyncOrchestrator owns synchronize(), single-flight, event triggers and backoff; no periodic polling.
- Keep schema 4 migrations, legacy sync_queue/model and importLegacy: they preserve offline data.
- Preserve per-account databases and pending work on logout; no reset, downgrade or destructive migration.
- Keep IDs as client-generated UUID strings and project ownership/audit fields out of push.
- Auth/account/COI remain REST; COI requires synchronized genealogy.
- See [integration](docs/LOCAL_FIRST_MOBILE.md) and [setup](README_SETUP.md).

## Testing Guidelines

- Framework: Jest with `react-native` preset (`jest.config.js`).
- Place tests in `__tests__/` or alongside modules as `*.test.ts(x)`.
- Test names should describe behavior (example: `renders correctly`).
- Run `npm test` before opening a PR; add tests for new store logic, API utilities, and reusable UI behavior.
- Latest cleanup verification: 59 tests pass; TypeScript passes; full lint still has 14 preexisting errors. Native E2E and iOS are pending. Do not present previous debug compilation as device verification.

## Commit & Pull Request Guidelines

Recent history includes mixed styles (`feat:config project`, `otro`, `first commit`). Standardize on Conventional Commits going forward:

- `feat: add auth token refresh`
- `fix: handle API timeout in ApiService`

PRs should include:

- Clear summary and scope.
- Linked issue/ticket (if available).
- Test evidence (`npm test`, `npm run lint`).
- Screenshots or short video for UI changes.
