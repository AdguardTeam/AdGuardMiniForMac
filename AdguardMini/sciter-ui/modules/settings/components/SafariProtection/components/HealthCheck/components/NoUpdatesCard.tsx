// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { RequestOpenSettingsPageRequest } from 'Apis/requests/TrayService';
import { Text } from 'Modules/common/components';
import { useSettingsStore } from 'SettingsLib/hooks';

import { HealthCheckCard } from './HealthCheckCard';
import { HealthCheckDismissId } from './HealthCheckDismissId';

/**
 * Displays a health check card when filter rules haven't been updated for more than 7 days.
 * Provides an action button to open the updates settings page and an option to dismiss.
 */
function NoUpdatesCardComponent() {
    const {
        settings,
    } = useSettingsStore();
    const {
        dissmissedHealthCheckCards,
    } = settings;

    return (
        <HealthCheckCard
            color="neutral"
            cta={[{
                label: translate('safari.protection.health.updates.cta'),
                onClick: () => {
                    void window.API.Execute(new RequestOpenSettingsPageRequest({ value: 'tray_updates' }));
                },
            }]}
            description={(
                <Text type="t2">
                    {translate('safari.protection.health.updates.desc')}
                </Text>
            )}
            title={translate('safari.protection.health.updates')}
            onClose={() => settings.updateHealthCheckDismissedCards([
                ...dissmissedHealthCheckCards,
                HealthCheckDismissId.NoUpdates,
            ])}
        />
    );
}

export const NoUpdatesCard = observer(NoUpdatesCardComponent);
