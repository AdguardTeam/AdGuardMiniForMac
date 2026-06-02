// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { Text } from 'Modules/common/components';
import { useNotificationSomethingWentWrongText, useSettingsStore } from 'SettingsLib/hooks';

import { HealthCheckCard } from './HealthCheckCard';
import { HealthCheckDismissId } from './HealthCheckDismissId';

/**
 * Displays a health check card when ad blocking is disabled.
 * Provides an action button to enable ad blocking with error handling.
 */
function AdBlockingDisabledCardComponent() {
    const {
        settings,
        filters,
    } = useSettingsStore();
    const {
        dissmissedHealthCheckCards,
    } = settings;
    const notifyError = useNotificationSomethingWentWrongText();

    const enableAdBlocking = async () => {
        const error = await filters.updateBlockAds(true);
        if (error) {
            notifyError();
        }
    };

    return (
        <HealthCheckCard
            color="neutral"
            cta={[{ label: translate('safari.protection.health.enable'), onClick: enableAdBlocking }]}
            description={(
                <Text type="t2">
                    {translate('safari.protection.health.ad.blocking.desc')}
                </Text>
            )}
            title={translate('safari.protection.health.ad.blocking')}
            onClose={() => settings.updateHealthCheckDismissedCards([
                ...dissmissedHealthCheckCards,
                HealthCheckDismissId.AdBlockingDisabled,
            ])}
        />
    );
}

export const AdBlockingDisabledCard = observer(AdBlockingDisabledCardComponent);
