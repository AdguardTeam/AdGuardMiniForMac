// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import lodashPlugin from 'eslint-plugin-lodash';
import { defineConfig } from 'eslint/config';
import commonConfig from '@adg/sciter-infra-utils/configs/eslint/common-config.mjs';

export default defineConfig([
    {
      ignores: [
        "AdguardMini/sciter-ui/modules/common/sciterBootstrap.ts",
        "AdguardMini/sciter-ui/scripts/**",
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
            "jsx-a11y/click-events-have-key-events": "off",
            "jsx-a11y/no-static-element-interactions": "off",
            "jsx-a11y/no-noninteractive-element-interactions": "off",
            "@typescript-eslint/no-unnecessary-condition": "off",
            "jsx-a11y/control-has-associated-label": "off",
        }
    }
]);
