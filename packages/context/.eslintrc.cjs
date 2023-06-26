// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

module.exports = {
    root: true,
    extends: ['eslint:recommended', 'plugin:react/recommended', 'plugin:react/jsx-runtime', 'prettier'],
    plugins: ['react', 'prettier'],
    settings: {
        react: {
            version: 'detect',
        },
    },
    env: {
        browser: true,
        es6: true,
    },
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    ignorePatterns: ['.eslintrc.cjs', '**/dist'],
    rules: {
        'prettier/prettier': 'error',
    },
    overrides: [
        {
            files: ['**/*.ts', '**/*.tsx'],
            parser: '@typescript-eslint/parser',
            extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
            rules: {
                '@typescript-eslint/no-empty-function': 'off',
                '@typescript-eslint/no-unused-vars': ['error', { vars: 'all', args: 'none', ignoreRestSiblings: true }],
            },
        },
    ],
};
