// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveStoryImageSize } from '../../modules/tray/modules/stories/utils/storyImageSize';

test('resolveStoryImageSize maps button count to size', () => {
    assert.equal(resolveStoryImageSize(0), 'big');
    assert.equal(resolveStoryImageSize(1), 'medium');
    assert.equal(resolveStoryImageSize(2), 'small');
    assert.equal(resolveStoryImageSize(3), 'small');
});
