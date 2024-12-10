import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    files: ['src/**/*.ts'],
    ignores: ['**/dist', '**/node_modules'],
    rules: {
      'eol-last': 'error',
      indent: ['error', 2],
      'max-len': ['error', 128],
    },
  }
);