// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import translate from 'Intl';
import tx from 'Theme';
import cx from 'classix';

// Single source of truth for the injected helper names: an export `__miniFoo`
// makes the build replace the global `foo` with it.
export {
    translate as __miniTranslate,
    tx as __miniTx,
    cx as __miniCx,
};
