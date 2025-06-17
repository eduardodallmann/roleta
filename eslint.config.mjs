import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { includeIgnoreFile } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import react from 'eslint-plugin-react';
import sonarjs from 'eslint-plugin-sonarjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});
const gitignorePath = path.resolve(__dirname, '.gitignore');

/**
 * @type {import("eslint").ESLint.Options}
 */
export default [
  ...compat.extends('eslint-config-prettier'),
  includeIgnoreFile(gitignorePath),
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    plugins: {
      prettier,
      sonarjs,
      '@typescript-eslint': typescriptEslint,
      react,
    },

    languageOptions: {
      parser: tsParser,
      ecmaVersion: 5,
      sourceType: 'script',

      parserOptions: {
        parser: '@typescript-eslint/parser',
        project: './tsconfig.json',
        tsconfigRootDir: './',
      },
    },

    rules: {
      curly: 'error',
      'prefer-const': 'error',
      'prefer-destructuring': 'error',

      'no-console': [
        'error',
        {
          allow: ['warn', 'error', 'info'],
        },
      ],

      'no-nested-ternary': 'error',
      'no-debugger': 'error',
      'no-new-wrappers': 'error',
      'object-shorthand': 'error',
      'no-return-await': 'error',
      'consistent-return': 'error',
      'no-unused-vars': 'off',
      'no-unneeded-ternary': 'error',
      'prefer-template': 'error',
      'no-implicit-coercion': 'error',
      'lines-between-class-members': ['error', 'always'],

      'padding-line-between-statements': [
        'error',
        {
          blankLine: 'always',
          prev: '*',
          next: 'return',
        },
        {
          blankLine: 'always',
          prev: '*',
          next: 'case',
        },
        {
          blankLine: 'always',
          prev: '*',
          next: 'default',
        },
        {
          blankLine: 'always',
          prev: '*',
          next: 'export',
        },
        {
          blankLine: 'always',
          prev: '*',
          next: 'function',
        },
      ],

      'prettier/prettier': 'error',
      'sonarjs/cognitive-complexity': 'error',
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-duplicate-string': 'error',
      'sonarjs/prefer-immediate-return': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/prefer-for-of': 'error',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],

      'react/jsx-boolean-value': 'error',
      'react/no-children-prop': 'error',
      'react/self-closing-comp': 'error',
      'react/display-name': 'error',
    },
  },
];
