import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx,cjs,js}'],

    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    // ADD THIS STRICT RULES BLOCK HERE:
    rules: {
      "@typescript-eslint/no-explicit-any": "error",    // Prevents using 'any' to bypass type checking
      "@typescript-eslint/no-unused-vars": "warn",     // Catches variables you created but forgot to use
      "no-console": ["warn", { allow: ["warn", "error", "log"] }],
      "eqeqeq": "error"                                 // Screams if you use risky == instead of ===
    }
  },
])
