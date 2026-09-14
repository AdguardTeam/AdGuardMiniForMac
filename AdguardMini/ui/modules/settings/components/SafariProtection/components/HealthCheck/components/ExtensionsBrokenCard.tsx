// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import throttle from 'lodash/throttle';
import { observer } from 'mobx-react-lite';

import { RequestReloadContentBlockersRequest } from 'Apis/requests/SafariExtensionsService';
import { Text } from 'Modules/common/components';
import { useSettingsStore } from 'SettingsLib/hooks';
import { RouteName } from 'SettingsStore/modules';

import { HealthCheckCard } from './HealthCheckCard';

/**
 * Props for the ExtensionsBrokenCard component.
 * @param showRestart - Whether a content blocker reload can recover at least
 * one broken extension. When false, only converter errors remain and the
 * card offers contact support instead.
 */
type ExtensionsBrokenCardProps = {
    showRestart: boolean;
};

/**
 * Displays a health check card when Safari extensions are broken.
 * Offers a restart action when a reload can help; for a pure converter
 * error, which survives reloads, it offers the contact support route.
 */
function ExtensionsBrokenCardComponent({ showRestart }: ExtensionsBrokenCardProps) {
    const { router } = useSettingsStore();

    return (
        <HealthCheckCard
            color="orange"
            cta={[{
                label: showRestart 
                    ? translate('safari.protection.health.extensions.disabled.cta')
                    : translate('support.contact.support'),
                onClick: showRestart
                    ? throttle(async () => window.API.Execute(new RequestReloadContentBlockersRequest()), 1000)
                    : () => router.changePath(RouteName.contact_support),
            }]}
            description={(
                <Text type="t2">
                    {showRestart
                        ? translate('safari.protection.health.extensions.disabled.desc')
                        : translate('safari.protection.health.extensions.converter.desc')
                    }
                </Text>
            )}
            title={translate('safari.protection.health.extensions.disabled')}
        />
    );
}

export const ExtensionsBrokenCard = observer(ExtensionsBrokenCardComponent);
