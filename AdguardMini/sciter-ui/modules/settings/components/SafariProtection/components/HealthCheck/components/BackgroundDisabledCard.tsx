// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { Text } from 'Modules/common/components';
import { useSettingsStore } from 'SettingsLib/hooks';

import s from '../HealthCheck.module.pcss';

import { HealthCheckCard } from './HealthCheckCard';

/**
 * Displays a health check card when background/login item mode is disabled.
 * Provides an action button to open login items settings in macOS.
 */
function BackgroundDisabledCardComponent() {
    const {
        settings,
    } = useSettingsStore();

    return (
        <HealthCheckCard
            color="orange"
            cta={[{
                label: translate('safari.protection.health.login.item.cta'),
                onClick: settings.openLoginItemsSettings,
            }]}
            description={(
                <div>
                    <Text type="t2">{translate('safari.protection.health.login.item.desc')}</Text>
                    <Text className={s.HealthCheck_listitem} type="t2">{translate('safari.protection.health.login.item.desc1')}</Text>
                    <Text type="t2">{translate('safari.protection.health.login.item.desc2')}</Text>
                </div>
            )}
            title={translate('safari.protection.health.login.item')}
        />
    );
}

export const BackgroundDisabledCard = observer(BackgroundDisabledCardComponent);
