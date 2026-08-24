// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { Layout } from 'UILib';

import { AdvancedBlockingControl } from './components/AdvancedBlockingControl';

/**
 * Advanced Blocking page in settings module
 */
function AdvancedBlockingComponent() {
    return (
        <Layout type="settingsPage">
            <AdvancedBlockingControl />
        </Layout>
    );
}

export const AdvancedBlocking = observer(AdvancedBlockingComponent);
