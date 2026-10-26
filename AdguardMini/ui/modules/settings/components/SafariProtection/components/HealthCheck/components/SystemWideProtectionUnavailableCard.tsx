// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { Text } from 'Modules/common/components';
import { useSettingsStore } from 'SettingsLib/hooks';
import { RouteName } from 'SettingsStore/modules';

import { HealthCheckCard } from './HealthCheckCard';

/**
 * Displays a health check card when System-wide Protection cannot run.
 * Provides an action button that opens the System-wide Protection settings,
 * where the troubleshooting steps are available.
 */
function SystemWideProtectionUnavailableCardComponent() {
    const {
        router,
    } = useSettingsStore();

    return (
        <HealthCheckCard
            color="orange"
            cta={[{
                label: translate('safari.protection.health.swp.unavailable.cta'),
                onClick: () => router.changePath(RouteName.system_wide_protection),
            }]}
            description={(
                <Text type="t2">
                    {translate('safari.protection.health.swp.unavailable.desc')}
                </Text>
            )}
            title={translate('safari.protection.health.swp.unavailable')}
        />
    );
}

export const SystemWideProtectionUnavailableCard = observer(SystemWideProtectionUnavailableCardComponent);
