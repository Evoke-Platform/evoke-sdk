// Copyright (c) 2023 System Automation Corporation.
// This file is licensed under the MIT License.

module.exports = {
    root: true,
    extends: ['eslint:recommended', 'prettier'],
    plugins: ['prettier'],
    env: {
        node: true,
        es6: true,
    },
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    ignorePatterns: ['**/dist'],
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
