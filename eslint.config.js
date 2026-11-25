import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default defineConfig([
    // Diretórios ignorados
    {
        ignores: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**'],
    },

    // JavaScript
    {
        files: ['**/*.js', '**/*.mjs', '**/*.cjs'],

        extends: [js.configs.recommended],

        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: globals.node,
        },
    },

    // TypeScript
    {
        files: ['**/*.ts'],

        extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],

        languageOptions: {
            globals: globals.node,

            parserOptions: {
                project: ['./tsconfig.test.json'],
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    eslintConfigPrettier,
]);
