// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Guard for the legacy `theme:generate` script.
 *
 * UI color tokens are vendored from AdGuardSoftwareLimited/frontend-bundle
 * (`src/Resources/views/shared/styles/themes/variables/{products,themes}/*.css`),
 * which generates them from the Figma design tokens exported to
 * AdGuardSoftwareLimited/designteam-materials.
 *
 * The old sciter-infra-utils generator writes the deprecated v1.0.4 palette
 * and would silently overwrite the vendored stylesheets, so it is disabled.
 */
console.error(
    'UI color tokens are vendored from AdGuardSoftwareLimited/frontend-bundle '
        + '(themes/variables). Do not regenerate them with sciter-infra-utils — '
        + 're-copy blocker.css, light.css and dark.css from frontend-bundle instead.',
);
process.exit(1);
