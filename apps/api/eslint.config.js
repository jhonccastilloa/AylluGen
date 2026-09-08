const parser = require('@typescript-eslint/parser');
const ts = require('@typescript-eslint/eslint-plugin');

module.exports = [
  { ignores: ['dist/**', 'node_modules/**', 'src/infrastructure/database/prisma/generated/**'] },
  {
    files: ['src/**/*.ts'],
    languageOptions: { parser, parserOptions: { ecmaVersion: 2022, sourceType: 'module' } },
    plugins: { '@typescript-eslint': ts },
    rules: {
      'no-debugger': 'error',
      'no-constant-condition': 'error',
      'no-duplicate-case': 'error',
      'constructor-super': 'error',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
    },
  },
];
