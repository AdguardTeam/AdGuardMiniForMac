// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { Text } from 'Modules/common/components';
import { useSettingsStore } from 'SettingsLib/hooks';
import { RouteName } from 'SettingsStore/modules';

import { HealthCheckCard } from './HealthCheckCard';

/**
 * Displays a health check card when Safari extensions are broken.
 * Provides a link to contact support for assistance.
 */
function ExtensionsBrokenCardComponent() {
    const {
        router,
    } = useSettingsStore();

    return (
        <HealthCheckCard
            color="orange"
            cta={[{
                label: translate('safari.protection.health.extensions.disabled.cta'),
                onClick: () => router.changePath(RouteName.contact_support),
            }]}
            description={(
                <Text type="t2">
                    {translate('safari.protection.health.extensions.disabled.desc')}
                </Text>
            )}
            title={translate('safari.protection.health.extensions.disabled')}
        />
    );
}

export const ExtensionsBrokenCard = observer(ExtensionsBrokenCardComponent);
