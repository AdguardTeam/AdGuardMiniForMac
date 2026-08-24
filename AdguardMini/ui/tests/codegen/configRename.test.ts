// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('proto-generator config renames', () => {
    const cfgDir = 'AdguardMini/ui/schema/.protocfg';

    it('swift.json renames service_class_name away from SciterBridge', () => {
        const cfg = JSON.parse(readFileSync(path.join(cfgDir, 'swift.json'), 'utf8'));
        assert.notEqual(cfg.service_class_name, 'SciterBridge');
        assert.equal(cfg.service_class_name, 'WebViewBridge');
    });

    it('swift.json renames callback_class_name away from SwiftBridge', () => {
        const cfg = JSON.parse(readFileSync(path.join(cfgDir, 'swift.json'), 'utf8'));
        assert.notEqual(cfg.callback_class_name, 'SwiftBridge');
        assert.equal(cfg.callback_class_name, 'WebViewCallbackBridge');
    });

    it('swift.json lib_name is no longer SciterSwift', () => {
        const cfg = JSON.parse(readFileSync(path.join(cfgDir, 'swift.json'), 'utf8'));
        assert.notEqual(cfg.lib_name, 'SciterSwift');
    });

    it('typescript.json renames xcall_method_name away from xcall', () => {
        const cfg = JSON.parse(readFileSync(path.join(cfgDir, 'typescript.json'), 'utf8'));
        assert.notEqual(cfg.xcall_method_name, 'xcall');
        assert.equal(cfg.xcall_method_name, 'postMessage');
    });
});
