// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Vendored self-contained copy of the
 * `@adg/sciter-infra-utils/configs/eslint/common-config.mjs` flat config.
 *
 * Imported by `prod.mjs` so that the ESLint setup no longer depends on the
 * presence of the `@adg/sciter-infra-utils` npm package's ESLint surface
 * (only on the package's CLI binary, which `package.json` lines 30–35
 * still invoke — that CLI dependency is retained until a follow-up PR
 * replaces it).
 */

import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import { globalIgnores } from 'eslint/config';
import path from 'path';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import stylistic from '@stylistic/eslint-plugin';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import jsDoc from 'eslint-plugin-jsdoc';
import mobxPlugin from 'eslint-plugin-mobx';
import importPlugin from 'eslint-plugin-import';

// Resolve the repo-root tsconfig relative to this file so linting works
// regardless of the process cwd (CI, IDE, or a subdirectory script), while
// the file stays inside the vendored config directory.
const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..');
const tsconfigPath = path.join(repoRoot, 'tsconfig.json');

export default [
    /**
     * Ignore following path patterns
     */
    globalIgnores([
        'build',
        'scripts',
        'src/sciterBootstrap.ts',
        // Only the generated API surface is ignored; the hand-written bridge
        // files at `modules/common/apis/` root (rpcPostMessage, apiWindow,
        // callbackDispatch, bridgeBytes) stay linted.
        '**/apis/requests',
        '**/apis/types',
        '**/apis/callbacks',
        '**/*.js',
        '**/*.test.ts',
    ]),
    /**
     * MARK: Common configuration
     */
    {
        extends: [
            tseslint.configs.eslintRecommended,
            tseslint.configs.recommended,
            mobxPlugin.flatConfigs.recommended,
            reactHooks.configs['recommended-latest'],
            reactPlugin.configs.flat.recommended,
            reactPlugin.configs.flat['jsx-runtime'],
            importPlugin.flatConfigs.errors,
            importPlugin.flatConfigs.warnings,
            importPlugin.flatConfigs.typescript,
            stylistic.configs.customize({
                arrowParens: true,
                blockSpacing: true,
                braceStyle: '1tbs',
                commaDangle: 'always-multiline',
                indent: 4,
                jsx: true,
                pluginName: '@stylistic',
                quoteProps: 'consistent-as-needed',
                quotes: 'single',
                semi: true,
                severity: 'warn',
            }),
        ],
        files: [
            '**/*.{ts,tsx}',
        ],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: tsconfigPath,
                tsconfigRootDir: import.meta.dirname,
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                ...globals.browser,
                ...globals.commonjs,
                ...globals.es2015,
                ...globals.es2020,
                ...globals.jest,
            },
        },
        plugins: {
            '@typescript-eslint': tseslint.plugin,
            '@stylistic': stylistic,
            'jsdoc': jsDoc,
            'jsx-a11y': jsxA11y,
        },
        settings: {
            react: {
                version: 'detect',
                pragma: 'React',
            },
            'componentWrapperFunctions': [
                'observer',
            ],
            'import/resolver': {
                typescript: {
                    alwaysTryTypes: true,
                },
            },
        },
        rules: {
            /**
             * MARK: Core
             */
            'arrow-body-style': 'off',
            'consistent-return': 'off',
            'curly': ['error', 'all'],
            'default-case': 'off',
            'prefer-template': 'off',
            'prefer-arrow-callback': 'off',
            'indent': ['off', 4],
            'no-alert': 'error',
            'no-console': 'error',
            'no-debugger': 'error',
            'class-methods-use-this': 'off',
            'no-underscore-dangle': 'off',
            'no-useless-escape': 'off',
            'no-unused-expressions': ['error', {
                'allowShortCircuit': true,
            }],
            'no-param-reassign': ['error', { 'props': false }],
            'object-curly-newline': 'off',
            'no-plusplus': 'off',
            'max-len': [
                'error',
                120,
                2,
                {
                    'ignoreUrls': true,
                    'ignoreComments': false,
                    'ignoreRegExpLiterals': true,
                    'ignoreStrings': true,
                    'ignoreTemplateLiterals': true,
                },
            ],
            'no-useless-constructor': 'off',
            'no-unsafe-optional-chaining': 'warn',
            /**
             * MARK: eslint-plugin-mobx
             */
            'mobx/missing-observer': 'off',
            /**
             * MARK: eslint-plugin-jsdoc
             */
            'jsdoc/require-jsdoc': ['warn', { 'require': { 'ClassDeclaration': true, 'ClassExpression': true, 'MethodDefinition': true } }],
            /**
             * MARK: eslint-plugin-jsx-a11y
             */
            'jsx-a11y/aria-props': 'warn',
            'jsx-a11y/aria-proptypes': 'warn',
            'jsx-a11y/aria-role': 'warn',
            'jsx-a11y/aria-unsupported-elements': 'warn',
            'jsx-a11y/control-has-associated-label': 'warn',
            'jsx-a11y/no-redundant-roles': 'warn',
            'jsx-a11y/role-has-required-aria-props': 'warn',
            'jsx-a11y/role-supports-aria-props': 'warn',
            'jsx-a11y/interactive-supports-focus': 'warn',
            'jsx-a11y/mouse-events-have-key-events': 'warn',
            'jsx-a11y/no-interactive-element-to-noninteractive-role': 'warn',
            'jsx-a11y/no-noninteractive-element-to-interactive-role': 'warn',
            'jsx-a11y/click-events-have-key-events': 'warn',
            'jsx-a11y/no-noninteractive-element-interactions': 'warn',
            'jsx-a11y/no-static-element-interactions': 'warn',
            /**
             * MARK: eslint-plugin-import
             */
            'import/no-cycle': 'off',
            'import/prefer-default-export': 'off',
            'import/no-named-as-default': 'off',
            'import/order': ['warn', {
                'groups': [
                    'external',
                    'builtin',
                    'internal',
                    'parent',
                    'sibling',
                    'index',
                    'object',
                    'type',
                ],
                'newlines-between': 'always',
                'alphabetize': {
                    'order': 'asc',
                    'caseInsensitive': true,
                },
                'warnOnUnassignedImports': true,
            }],
            /**
             * MARK: typescript-eslint
             */
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/explicit-function-return-type': ['off', { 'allowExpressions': true }],
            '@typescript-eslint/interface-name-prefix': ['off', { 'prefixWithI': 'never' }],
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/naming-convention': ['error', {
                'selector': 'enum',
                'format': ['UPPER_CASE', 'PascalCase'],
            }],
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/consistent-type-imports': 'warn',
            '@typescript-eslint/no-explicit-any': ['off'],
            '@typescript-eslint/explicit-member-accessibility': ['warn', {
                'accessibility': 'explicit',
                'overrides': {
                    'constructors': 'off',
                },
            }],
            '@typescript-eslint/member-ordering': [
                'warn',
                {
                    'default': {
                        'memberTypes': [
                            // Signatures
                            'call-signature',
                            'signature',
                            // Fields
                            'private-field',
                            'protected-field',
                            'public-field',
                            // Getters
                            'private-get',
                            'protected-get',
                            'public-get',
                            // Setters
                            'private-set',
                            'protected-set',
                            'public-set',
                            // Constructor
                            'constructor',
                            // Methods
                            'private-method',
                            'protected-method',
                            'public-method',
                        ],
                    },
                },
            ],
            '@typescript-eslint/method-signature-style': ['warn', 'method'],
            '@typescript-eslint/no-unnecessary-condition': 'warn',
            '@typescript-eslint/prefer-readonly': 'warn',
            '@typescript-eslint/strict-boolean-expressions': [
                'warn',
                {
                    allowNullableBoolean: true,
                },
            ],
            '@typescript-eslint/switch-exhaustiveness-check': 'warn',
            '@typescript-eslint/prefer-includes': 'warn',
            '@typescript-eslint/prefer-reduce-type-parameter': 'warn',
            '@typescript-eslint/prefer-regexp-exec': 'warn',
            '@typescript-eslint/promise-function-async': 'warn',
            '@typescript-eslint/no-useless-constructor': 'warn',
            '@typescript-eslint/no-unsafe-call': 'error',
            '@typescript-eslint/no-shadow': 'error',
            '@typescript-eslint/prefer-promise-reject-errors': 'error',
            '@typescript-eslint/only-throw-error': 'error',
            '@typescript-eslint/no-wrapper-object-types': 'warn',
            '@typescript-eslint/no-array-delete': 'warn',
            '@typescript-eslint/no-misused-spread': 'error',
            /**
             * MARK: @stylistics/eslint-plugin
             */
            '@stylistic/indent': ['warn', 4],
            /**
             * MARK: eslint-plugin-react
             */
            'react/no-unknown-property': 'off',
            'react/no-unused-prop-types': 'off',
            'react/display-name': 'off',
            'react/jsx-indent-props': ['error', 4],
            'react/jsx-indent': ['error', 4],
            'react/jsx-one-expression-per-line': 'off',
            'react/jsx-props-no-spreading': 'off',
            'react/prop-types': 'off',
            'react/state-in-constructor': 'off',
            'react/jsx-filename-extension': ['warn', { 'extensions': ['.tsx'] }],
            'react/react-in-jsx-scope': 'off',
            'react/require-default-props': 'off',
            'react/function-component-definition': ['warn', {
                'namedComponents': 'function-declaration',
                'unnamedComponents': 'function-expression',
            }],
            'react/jsx-sort-props': ['warn', {
                'ignoreCase': true,
                'reservedFirst': true,
                'callbacksLast': true,
                'shorthandLast': true,
            }],
        },
    },
];
