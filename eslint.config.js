import js from '@eslint/js'
import { globalIgnores } from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import reactDom from 'eslint-plugin-react-dom'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import reactX from 'eslint-plugin-react-x'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config([
  globalIgnores([
    'dist',
    '*.d.ts',
    '*.config.{ts,js}',
    'coverage',
    'worker-configuration.d.ts',
  ]),
  {
    files: ['**/*.{ts,tsx,js}'],
    ignores: ['**/*.{d.ts}', '**/worker-configuration.d.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactX.configs['recommended-typescript'],
      reactDom.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
      eslintConfigPrettier,
      // eslintPluginPrettierRecommended,
    ],
    languageOptions: {
      parserOptions: {
        project: [
          './tsconfig.node.json',
          './tsconfig.app.json',
          './tsconfig.worker.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
      ecmaVersion: 'latest',
      globals: globals.browser,
    },
  },
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
])
