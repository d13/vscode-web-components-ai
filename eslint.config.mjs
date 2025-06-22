import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Base JavaScript configuration for all files
  js.configs.recommended,

  // TypeScript configuration for .ts files only
  {
    files: ['src/**/*.ts'],
    extends: [...tseslint.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.node.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.node.json',
        },
      },
    },
    rules: {
      'no-debugger': 'off',
      // Import ordering and organization rules
      'import/order': [
        'error',
        {
          groups: [
            'builtin', // Node.js built-in modules
            'external', // npm packages
            'internal', // Internal modules (configured with path mapping)
            'parent', // ../
            'sibling', // ./
            'index', // ./index
          ],
          'newlines-between': 'never',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/first': 'error',
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'off', // TypeScript handles this
      'import/extensions': ['error', 'ignorePackages', { ts: 'never' }],

      // TypeScript import rules
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: false,
          fixStyle: 'separate-type-imports',
        },
      ],
      '@typescript-eslint/consistent-type-exports': [
        'error',
        {
          fixMixedExportsWithInlineTypeSpecifier: true,
        },
      ],

      // Custom rules - balanced approach for development
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-base-to-string': 'off', // Common pattern in VS Code
      '@typescript-eslint/no-duplicate-type-constituents': 'off', // False positives
      '@typescript-eslint/no-explicit-any': 'off', // Allowing any for flexibility... for now
      '@typescript-eslint/no-floating-promises': 'off', // Too strict for VS Code extension patterns
      '@typescript-eslint/no-misused-promises': 'off', // Common in VS Code APIs
      '@typescript-eslint/no-redundant-type-constituents': 'off', // False positives
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-unsafe-assignment': 'off', // Too strict for dynamic APIs
      '@typescript-eslint/no-unsafe-member-access': 'off', // Too strict for dynamic APIs
      '@typescript-eslint/no-unsafe-argument': 'off', // Too strict for dynamic APIs
      '@typescript-eslint/no-unsafe-return': 'off', // Too strict for dynamic APIs
      '@typescript-eslint/no-use-before-define': ['error', { functions: false, classes: false }],
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/prefer-promise-reject-errors': ['error', { allowEmptyReject: true }],
      '@typescript-eslint/restrict-template-expressions': 'off', // Too strict for logging
      '@typescript-eslint/unbound-method': 'off', // Too strict for VS Code APIs
    },
  },
  {
    ignores: [
      'dist/',
      'node_modules/',
      '*.js',
      'webpack.config.mjs',
      'scripts/',
      '.vscode-test/',
      '.vscode-test-web/',
      'LICENSE',
      'ThirdPartyNotices.txt',
    ],
  },
  prettier,
);
