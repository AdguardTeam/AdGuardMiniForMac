// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useSettingsStore } from 'SettingsLib/hooks';
import { SettingsEvent } from 'SettingsStore/modules';
import theme from 'Theme';
import { Text } from 'UILib';

import { SettingsItemSwitch } from '../../SettingsItem';
import { useSafariProtectionContext } from '../hooks/useSafariProtectionContext';
import s from '../SafariProtection.module.pcss';

/**
 * Tracking section for Safari protection
 */
export function TrackingSection() {
    const { safariProtection, telemetry } = useSettingsStore();
    const { createErrorWrapper } = useSafariProtectionContext();

    const onToggleBlockTrackers = createErrorWrapper(async (value) => {
        telemetry.trackEvent(SettingsEvent.BlockTrackerClick);
        return safariProtection.updateBlockTrackers(value);
    });

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
