// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { Text } from 'Modules/common/components';
import { useSettingsStore } from 'SettingsLib/hooks';
import { RouteName } from 'SettingsStore/modules';

import { HealthCheckCard } from './HealthCheckCard';

/**
 * Displays a health check card when Safari content blocker rules limit is exceeded.
 * Provides action buttons to navigate to filters or user rules sections for reducing rule count.
 */
function RulesLimitExceededCardComponent() {
    const {
        router,
    } = useSettingsStore();

    return (
        <HealthCheckCard
            color="orange"
            cta={[
                {
                    label: translate('safari.protection.health.rules.limit.cta'),
                    onClick: () => router.changePath(RouteName.filters),
                },
                {
                    label: translate('safari.protection.health.rules.limit.cta2'),
                    onClick: () => router.changePath(RouteName.user_rules),
                },
            ]}
            description={(
                <Text type="t2">
                    {translate('safari.protection.health.rules.limit.desc')}
                </Text>
            )}
            title={translate('safari.protection.health.rules.limit')}
        />
    );
}

export const RulesLimitExceededCard = observer(RulesLimitExceededCardComponent);
