// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/** Frame image size by button count. */
export type StoryImageSize = 'big' | 'medium' | 'small';

/** Resolve frame image size by button count. */
export function resolveStoryImageSize(buttonCount: number): StoryImageSize {
    if (buttonCount >= 2) {
        return 'small';
    }
    if (buttonCount === 0) {
        return 'big';
    }
    return 'medium';
}
