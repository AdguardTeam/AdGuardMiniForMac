// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { RouteName } from 'SettingsStore/modules';
import theme from 'Theme';
import { Text, Button } from 'UILib';

import { SettingsItemLink, SettingsItemSwitch } from '../../SettingsItem';

import s from './SystemWideProtectionSwitch.module.pcss';

/**
 * Props for the system-wide protection settings switch.
 */
type Props = {
    muted: boolean;
    value: boolean;
    onChange(value: boolean): void;
    orangeIcon?: boolean;
    isNew?: boolean;
    disabled?: boolean;
    setShowNotSupportedModal(value: boolean): void;
    non501User: boolean;
    macos25OrLower: boolean;
};

/**
 * System-wide Protection switch component
 */
export function SystemWideProtectionSwitch(props: Props) {
    const {
        muted,
        value,
        onChange,
        isNew = false,
        orangeIcon = false,
        disabled = false,
        setShowNotSupportedModal,
        non501User,
        macos25OrLower,
    } = props;

    const renderWhyBtn = (text: string) => (
        <Button
            className={s.SystemWideProtectionSwitch_button}
            type="text"
            onClick={(e) => {
                e?.stopPropagation();
                setShowNotSupportedModal(true);
            }}
        >
            <Text className={theme.color.orange} type="t2">
                {text}
            </Text>
        </Button>
    );

    const whyBtnParams = { btn: renderWhyBtn };

    return muted
        ? (
            <SettingsItemLink
                additionalText={(
                    <div>
                        {macos25OrLower && (
                            <Text className={theme.color.orange} type="t2">
                                {translate('advanced.blocking.system.wide.wrong.os')}
                            </Text>
                        )}
                        {non501User && (
                            <Text className={theme.color.orange} type="t2">
                                {translate('advanced.blocking.system.wide.not.supported', whyBtnParams)}
                            </Text>
                        )}
                    </div>
                )}
                description={translate('advanced.blocking.system.wide.desc')}
                disabled={disabled}
                icon="apps"
                iconColor={orangeIcon ? 'orange' : undefined}
                internalLink={RouteName.system_wide_protection}
                newLabel={isNew}
                title={translate('advanced.blocking.system.wide')}
            />
        ) : (
            <SettingsItemSwitch
                additionalText={(
                    <div>
                        {macos25OrLower && (
                            <Text className={theme.color.orange} type="t2">
                                {translate('advanced.blocking.system.wide.wrong.os')}
                            </Text>
                        )}
                        {non501User && (
                            <Text className={theme.color.orange} type="t2">
                                {translate('advanced.blocking.system.wide.not.supported', whyBtnParams)}
                            </Text>
                        )}
                    </div>
                )}
                description={translate('advanced.blocking.system.wide.desc')}
                disabled={disabled}
                icon="apps"
                iconColor={orangeIcon ? 'orange' : undefined}
                muted={muted}
                newLabel={isNew}
                routeName={RouteName.system_wide_protection}
                setValue={onChange}
                title={translate('advanced.blocking.system.wide')}
                value={value}
            />
        );
}
