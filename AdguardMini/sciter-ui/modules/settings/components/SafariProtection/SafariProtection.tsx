// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { Layout } from 'UILib';

import { SafariProtectionControl } from './components/SafariProtectionControl';

/**
 * Safari Protection page in settings module
 */
function SafariProtectionComponent() {
    return (
        <Layout testId="settings-safari-protection-page" type="settingsPage">
            <SafariProtectionControl />
        </Layout>
    );
}

export const SafariProtection = observer(SafariProtectionComponent);
