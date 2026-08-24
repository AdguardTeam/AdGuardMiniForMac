// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import button from './Button.module.pcss';
import color from './Colors.module.pcss';
import layout from './Layout.module.pcss';
import typo from './Typography.module.pcss';

const theme = {
    typo,
    color,
    button,
    layout,
};

declare global {
    const tx: typeof theme;
}

export default theme;
