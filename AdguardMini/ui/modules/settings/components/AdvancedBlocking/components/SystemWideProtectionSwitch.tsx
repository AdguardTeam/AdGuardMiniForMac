// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useId } from 'preact/hooks';

import { RouteName } from 'SettingsStore/modules';
import theme from 'Theme';
import { Text, Button } from 'UILib';

import { SettingsItemLink, SettingsItemSwitch } from '../../SettingsItem';

import s from './SystemWideProtectionSwitch.module.pcss';

import type { NotSupportedModalReason } from '../../NotSupportedModal';

/**
 * Props for the system-wide protection settings switch.
 */
type Props = {
    muted: boolean;
    /**
     * Whether the user selected the feature but the filter is not running:
     * the switch shows its inactive "on" state.
     */
    inactive?: boolean;
    /**
     * Whether the bring-up runs: the switch is shown disabled in the light
     * product green until the filter is confirmed running.
     */
    enabling?: boolean;
    value: boolean;
    onChange(value: boolean): void;
    orangeIcon?: boolean;
    isNew?: boolean;
    disabled?: boolean;
    setShowNotSupportedModal(reason: NotSupportedModalReason): void;
    non501User: boolean;
    macos25OrLower: boolean;
    isMacos272: boolean;
};

/**
 * System-wide Protection switch component
 */
export function SystemWideProtectionSwitch(props: Props) {
    const {
        muted,
        inactive = false,
        enabling = false,
        value,
        onChange,
        isNew = false,
        orangeIcon = false,
        disabled = false,
        setShowNotSupportedModal,
        non501User,
        macos25OrLower,
        isMacos272,
    } = props;

    // "Why?" sits inside a warning sentence, so alone it announces a bare
    // "Why?" with no idea what the question is about.
    const notSupportedId = useId();
    const macosNotSupportedId = useId();

    const renderWhyBtn = (text: string) => (
        <Button
            ariaDescribedby={notSupportedId}
            className={s.SystemWideProtectionSwitch_button}
            type="text"
            onClick={(e) => {
                e?.stopPropagation();
                setShowNotSupportedModal('account');
            }}
        >
            <Text className={theme.color.orange} type="t2">
                {text}
            </Text>
        </Button>
    );

    const renderMacOSWhyBtn = (text: string) => (
        <Button
            ariaDescribedby={macosNotSupportedId}
            className={s.SystemWideProtectionSwitch_button}
            type="text"
            onClick={(e) => {
                e?.stopPropagation();
                setShowNotSupportedModal('macosVersion');
            }}
        >
            <Text className={theme.color.orange} type="t2">
                {text}
            </Text>
        </Button>
    );

    const whyBtnParams = { btn: renderWhyBtn };
    const macosWhyBtnParams = { btn: renderMacOSWhyBtn };

    const warnings = (
        <div>
            {macos25OrLower && (
                <Text className={theme.color.orange} type="t2">
                    {translate('advanced.blocking.system.wide.wrong.os')}
                </Text>
            )}
            {non501User && (
                <Text className={theme.color.orange} id={notSupportedId} type="t2">
                    {translate('advanced.blocking.system.wide.not.supported', whyBtnParams)}
                </Text>
            )}
            {isMacos272 && (
                <Text className={theme.color.orange} id={macosNotSupportedId} type="t2">
                    {translate('advanced.blocking.system.wide.macos.27.2.warning', macosWhyBtnParams)}
                </Text>
            )}
        </div>
    );

    return muted
        ? (
            <SettingsItemLink
                additionalText={warnings}
                description={translate('advanced.blocking.system.wide.desc')}
                icon="apps"
                iconColor={orangeIcon ? 'orange' : undefined}
                internalLink={RouteName.system_wide_protection}
                newLabel={isNew}
                title={translate('advanced.blocking.system.wide')}
            />
        ) : (
            <SettingsItemSwitch
                additionalText={warnings}
                description={translate('advanced.blocking.system.wide.desc')}
                disabled={disabled}
                enabling={enabling}
                icon="apps"
                iconColor={orangeIcon ? 'orange' : undefined}
                muted={inactive}
                newLabel={isNew}
                routeName={RouteName.system_wide_protection}
                setValue={onChange}
                title={translate('advanced.blocking.system.wide')}
                value={value}
            />
        );
}
