import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // UI はデータを data/repository.ts を通して取得し、保存の方式 (SQLite / sql.js) に直接依存しない
    files: ['src/components/**', 'src/pages/**', 'src/data/**', 'src/hooks/**', 'src/*.{ts,tsx}'],
    ignores: ['src/main.tsx'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['sql.js', '**/db/*'], message: 'UI は data/repository.ts を通してデータを取得する' }],
      }],
    },
  },
  {
    // テストヘルパーは HMR の対象外なので Fast Refresh の制約は不要
    files: ['src/test/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
