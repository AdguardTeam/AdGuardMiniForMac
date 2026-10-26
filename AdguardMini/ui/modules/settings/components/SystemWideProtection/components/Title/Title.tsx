// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useId } from 'preact/hooks';

import { SettingsEvent } from 'Modules/settings/store/modules';
import { usePayedFuncsTitle, useSettingsStore } from 'SettingsLib/hooks';
import theme from 'Theme';
import { Button, Text } from 'UILib';

import { SettingsTitle } from '../../../SettingsTitle';

import s from './Title.module.pcss';

import type { NotSupportedModalReason } from '../../../NotSupportedModal';

/**
 * Props for System-wide Protection title component
 */
type TitleProps = {
    setShowNotSupportedModal(reason: NotSupportedModalReason): void;
    setShowResetCacheModal(value: boolean): void;
    setShowRemoveFilterModal(value: boolean): void;
};

/**
 * System-wide Protection title component for settings module
 */
function TitleComponent({ setShowNotSupportedModal, setShowResetCacheModal, setShowRemoveFilterModal }: TitleProps) {
    const { advancedBlocking, settings } = useSettingsStore();
    const { urlFilterNew: isSystemWideProtectionPageNew, urlFilterState: { isInstalled } } = advancedBlocking;
    const {
        isMacos272,
        macos25OrLower,
        non501User,
    } = settings.settings;

    const payedFuncsTitle = usePayedFuncsTitle(
        SettingsEvent.SystemWideProtectionGetFullVersionClick,
        s.Title_payedTitle_text,
    );

    const isUnsupported = macos25OrLower || non501User || !isInstalled;

    // Same as on the Advanced protection row: "Why?" alone says nothing about
    // what is not supported.
    const notSupportedId = useId();
    const macosNotSupportedId = useId();

    const renderWhyBtn = (text: string) => (
        <Button
            ariaDescribedby={notSupportedId}
            className={s.Title_button}
            type="text"
            onClick={() => {
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
            className={s.Title_button}
            type="text"
            onClick={() => {
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

    return (
        <SettingsTitle
            description={translate('advanced.blocking.system.wide.desc')}
            elements={isUnsupported ? undefined : [{
                text: translate('advanced.blocking.system.wide.reset.cache'),
                action: () => setShowResetCacheModal(true),
            }, {
                text: translate('advanced.blocking.system.wide.remove.filter'),
                action: () => setShowRemoveFilterModal(true),
                className: theme.button.redText,
            }]}
            newLabel={isSystemWideProtectionPageNew}
            title={translate('advanced.blocking.system.wide')}
        >
            {payedFuncsTitle && (
                <div className={s.Title_payedTitle}>
                    {payedFuncsTitle}
                </div>
            )}
            {macos25OrLower && (
                <div className={s.Title_wrongOsTitle}>
                    <Text className={theme.color.orange} type="t2">
                        {translate('advanced.blocking.system.wide.wrong.os')}
                    </Text>
                </div>
            )}
            {non501User && (
                <div className={s.Title_notSupportedTitle}>
                    <Text className={theme.color.orange} id={notSupportedId} type="t2">
                        {translate('advanced.blocking.system.wide.not.supported', whyBtnParams)}
                    </Text>
                </div>
            )}
            {isMacos272 && (
                <div className={s.Title_notSupportedTitle}>
                    <Text className={theme.color.orange} id={macosNotSupportedId} type="t2">
                        {translate('advanced.blocking.system.wide.macos.27.2.warning', macosWhyBtnParams)}
                    </Text>
                </div>
            )}
        </SettingsTitle>
    );
}

export const Title = observer(TitleComponent);
