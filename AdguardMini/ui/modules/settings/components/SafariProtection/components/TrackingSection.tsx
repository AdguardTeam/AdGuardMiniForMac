// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useSettingsStore, useNotificationSomethingWentWrongText } from 'SettingsLib/hooks';
import { SettingsEvent } from 'SettingsStore/modules';
import theme from 'Theme';
import { Text } from 'UILib';

import { SettingsItemSwitch } from '../../SettingsItem';
import s from '../SafariProtection.module.pcss';

/**
 * Tracking section for Safari protection
 */
function TrackingSectionComponent() {
    const { safariProtection, telemetry } = useSettingsStore();
    const notifyError = useNotificationSomethingWentWrongText();

    const onToggleBlockTrackers = async (value: boolean) => {
        telemetry.trackEvent(SettingsEvent.BlockTrackerClick);
        const error = await safariProtection.updateBlockTrackers(value);
        if (error) {
            notifyError();
        }
    };

    return (
        <div className={s.SafariProtection_block}>
            <Text className={cx(s.SafariProtection_block_title, theme.layout.content)} type="h5">{translate('safari.protection.part.tracking')}</Text>
            <SettingsItemSwitch
                description={translate('safari.protection.block.trackers.desc')}
                icon="tracking"
                setValue={onToggleBlockTrackers}
                title={translate('safari.protection.block.trackers')}
                value={safariProtection.blockTrackers}
            />
        </div>
    );
}

export const TrackingSection = observer(TrackingSectionComponent);
