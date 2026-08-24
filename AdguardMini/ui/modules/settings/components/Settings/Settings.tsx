// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { Layout } from 'UILib';

import { SettingsControl } from './components/SettingsControl';

/**
 * Settings page in settings module
 */
export function SettingsComponent() {
    return (
        <Layout type="settingsPage">
            <SettingsControl />
        </Layout>
    );
}

export const Settings = observer(SettingsComponent);
