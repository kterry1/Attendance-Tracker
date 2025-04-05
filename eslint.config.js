import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    ignores: ['node_modules/**', './backend/src/create-fake-password.js'], // Ignore specific files/folders
    files: ['**/*.{js,jsx,ts,tsx}'], // Specify file extensions to lint
    languageOptions: {
      ecmaVersion: 'latest', // Use the latest ECMAScript version
      sourceType: 'module',
      parser: tsParser, // Add the TypeScript parser
      parserOptions: {
        project: './backend/tsconfig.json', // Point to your TypeScript config
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin, // Add the TypeScript plugin
    },
    rules: {
      semi: ['error', 'always'], // Add your rules here
      // Add TypeScript-specific rules
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
];
