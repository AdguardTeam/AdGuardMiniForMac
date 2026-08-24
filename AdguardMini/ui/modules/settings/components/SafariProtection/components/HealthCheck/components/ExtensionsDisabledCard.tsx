// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { OpenSafariExtensionPreferencesRequest } from 'Apis/requests/SafariExtensionsService';
import { OptionalStringValue } from 'Apis/types';
import { Text } from 'Modules/common/components';

import { HealthCheckCard } from './HealthCheckCard';

/**
 * Displays a health check card when Safari extensions are disabled.
 * Provides an action button to open Safari extension preferences.
 */
function ExtensionsDisabledCardComponent() {
    return (
        <HealthCheckCard
            color="orange"
            cta={[{
                label: translate('safari.protection.health.extensions.off.cta'),
                onClick: () => {
                    window.API.Execute(new OpenSafariExtensionPreferencesRequest(new OptionalStringValue()));
                },
            }]}
            description={(
                <Text type="t2">
                    {translate('safari.protection.health.extensions.off.desc')}
                </Text>
            )}
            title={translate('safari.protection.health.extensions.off')}
        />
    );
}

export const ExtensionsDisabledCard = observer(ExtensionsDisabledCardComponent);
