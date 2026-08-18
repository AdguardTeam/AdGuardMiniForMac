// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { SettingsEvent } from 'Modules/settings/store/modules';
import { useIsSystemWideProtectionDisabled, usePayedFuncsTitle, useSettingsStore } from 'SettingsLib/hooks';
import { Button, Text } from 'UILib';
import theme from 'Theme';

import { SettingsTitle } from '../../../SettingsTitle';
import s from './Title.module.pcss';

/**
 * Props for System-wide Protection title component
 */
type TitleProps = {
    setShowNotSupportedModal: (value: boolean) => void;
    setShowResetCacheModal: (value: boolean) => void;
    setShowRemoveFilterModal: (value: boolean) => void;
};

/**
 * System-wide Protection title component for settings module
 */
function TitleComponent({ setShowNotSupportedModal, setShowResetCacheModal, setShowRemoveFilterModal }: TitleProps) {
    const { advancedBlocking, settings } = useSettingsStore();
    const {
        isPageNew: isSystemWideProtectionPageNew,
    } = advancedBlocking.urlFilterState;
    const {
        macos25OrLower,
        non501User,
    } = settings.settings;

    const payedFuncsTitle = usePayedFuncsTitle(
        SettingsEvent.SystemWideProtectionGetFullVersionClick,
        s.Title_payedTitle_text
    );

    // Unsupported accounts get only the warning line and no context menu with
    // cache reset and filter removal: those actions make no sense on an
    // unsupported system.
    const isUnsupported = useIsSystemWideProtectionDisabled();

    const renderWhyBtn = (text: string) => (
        <Button
            className={s.Title_button}
            type="text"
            onClick={() => {
                setShowNotSupportedModal(true);
            }}
        >
            <Text className={theme.color.orange} type="t2">
                {text}
            </Text>
        </Button>
    );

    const whyBtnParams = { btn: renderWhyBtn };

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
            maxTopPadding
        >
            <div className={s.Title_payedTitle}>
                {payedFuncsTitle}
            </div>
            {macos25OrLower && (
                <div className={s.Title_wrongOsTitle}>
                    <Text className={theme.color.orange} type="t2">
                        {translate('advanced.blocking.system.wide.wrong.os')}
                    </Text>
                </div>
            )}
            {non501User && (
                <div className={s.Title_notSupportedTitle}>
                    <Text className={theme.color.orange} type="t2">
                        {translate('advanced.blocking.system.wide.not.supported', whyBtnParams)}
                    </Text>
                </div>
            )}
        </SettingsTitle>
    );
}

export const Title = observer(TitleComponent);
