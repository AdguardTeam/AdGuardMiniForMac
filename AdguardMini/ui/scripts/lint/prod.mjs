// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import lodashPlugin from 'eslint-plugin-lodash';
import { defineConfig } from 'eslint/config';
import commonConfig from './common-config.mjs';

export default defineConfig([
    {
      ignores: [
        
        "AdguardMini/ui/modules/common/webViewBootstrap.ts",
        "AdguardMini/ui/tests/mocks/**",
        "AdguardMini/ui/packages/webview-utils-kit/vendor/**",
        "AdguardMini/ui/packages/proto-generator/**",
        "AdguardMini/ui/scripts/**",
      ]
    },
    commonConfig,
    {
        plugins: {
            'lodash': lodashPlugin,
        },
        rules: {
            'lodash/import-scope': ['error', 'method'],
            "@stylistic/multiline-ternary": "off",
            "@typescript-eslint/strict-boolean-expressions": "off",
            "@typescript-eslint/no-unnecessary-condition": "off",
            // Keyboard-handling a11y rules fail production lint so the CI
            // `yarn lint --quiet` lane rejects a new interactive element
            // without key handling. They are `warn` in `common-config.mjs`;
            // `--quiet` ignores warnings, so this override must be `error`.
            "jsx-a11y/click-events-have-key-events": "error",
            "jsx-a11y/no-static-element-interactions": "error",
            "jsx-a11y/no-noninteractive-element-interactions": "error",
            "jsx-a11y/control-has-associated-label": "error",
        }
    }
]);
