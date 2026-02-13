# Repository Guidelines

## Project Structure & Module Organization
`AylluGen` is a React Native + TypeScript app.
- `src/core`: shared config, constants, i18n, types, and utilities.
- `src/domain`: domain-level repository contracts.
- `src/infrastructure`: API client/services, repository implementations, theme setup, logger.
- `src/presentation`: UI components and providers.
- `src/store`: Zustand stores (`useAuthStore.ts`, `useThemeStore.ts`, etc.).
- `src/shared`: shared UI-adjacent types and utilities (toasts, helpers).
- `__tests__`: Jest tests (currently `App.test.tsx`).
- `android/` and `ios/`: native projects.

Use the alias `@/*` for imports from `src` (configured in `tsconfig.json` and Babel).

## Build, Test, and Development Commands
- `npm start`: starts Metro bundler.
- `npm run android`: builds/runs the app on Android.
- `npm run ios`: builds/runs the app on iOS simulator.
- `npm test`: runs Jest tests.
- `npm run lint`: runs ESLint across the repo.

iOS native deps (first clone or native dependency updates):
- `bundle install`
- `bundle exec pod install` (from `ios/`).

## Coding Style & Naming Conventions
- Language: TypeScript (`.ts`/`.tsx`) for app code.
- Formatting: Prettier (`singleQuote: true`, `trailingComma: all`, `arrowParens: avoid`).
- Linting: ESLint with `@react-native` config (`.eslintrc.js`).
- Components and screens: `PascalCase` file names (`ThemeToggle.tsx`).
- Hooks/stores: `camelCase` with `use` prefix (`useThemeStore.ts`).
- Keep domain contracts in `src/domain` and external integrations in `src/infrastructure`.

## Testing Guidelines
- Framework: Jest with `react-native` preset (`jest.config.js`).
- Place tests in `__tests__/` or alongside modules as `*.test.ts(x)`.
- Test names should describe behavior (example: `renders correctly`).
- Run `npm test` before opening a PR; add tests for new store logic, API utilities, and reusable UI behavior.

## Commit & Pull Request Guidelines
Recent history includes mixed styles (`feat:config project`, `otro`, `first commit`). Standardize on Conventional Commits going forward:
- `feat: add auth token refresh`
- `fix: handle API timeout in ApiService`

PRs should include:
- Clear summary and scope.
- Linked issue/ticket (if available).
- Test evidence (`npm test`, `npm run lint`).
- Screenshots or short video for UI changes.
