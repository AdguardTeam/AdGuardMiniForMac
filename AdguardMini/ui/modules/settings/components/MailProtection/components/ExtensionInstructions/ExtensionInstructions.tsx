// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useSettingsStore } from 'SettingsLib/hooks';
import { SettingsEvent } from 'SettingsStore/modules';
import theme from 'Theme';
import { Button, Text } from 'UILib';

import s from './ExtensionInstructions.module.pcss';

/**
 * Props for Apple Mail extension instructions component
 */
type Props = {
    /**
     * Whether Apple Mail tracking protection is enabled. The enabled state
     * points the user at the Extensions pane directly, the disabled one at
     * Apple Mail itself.
     */
    enabled: boolean;
};

/**
 * Apple Mail extension instructions component for settings page
 */
function ExtensionInstructionsComponent({ enabled }: Props) {
    const { advancedBlocking, telemetry } = useSettingsStore();

    const openMail = () => {
        telemetry.trackEvent(enabled
            ? SettingsEvent.MailProtectionOpenExtensionsClick
            : SettingsEvent.MailProtectionOpenMailClick);
        if (enabled) {
            advancedBlocking.openMailExtensionSettings();
        } else {
            advancedBlocking.openAppleMail();
        }
    };

    const semibold = (text: string) => <b>{text}</b>;

    return (
        <div className={s.ExtensionInstructions_block}>
            <Text className={cx(s.ExtensionInstructions_block_title, theme.layout.content)} type="h5">
                {translate('advanced.blocking.mail.tracking.protection.extension')}
            </Text>
            <ol className={s.ExtensionInstructions_list}>
                <li>
                    <Text type="t1">
                        {translate('advanced.blocking.mail.tracking.protection.extension.step.settings')}
                    </Text>
                </li>
                <li>
                    <Text type="t1">
                        {translate('advanced.blocking.mail.tracking.protection.extension.step.extensions', { b: semibold })}
                    </Text>
                </li>
                <li>
                    <Text type="t1">
                        {translate('advanced.blocking.mail.tracking.protection.extension.step.enable', { b: semibold })}
                    </Text>
                </li>
            </ol>
            <div className={s.ExtensionInstructions_link}>
                <Button type="text" onClick={openMail}>
                    <Text type="t1">
                        {enabled
                            ? translate('advanced.blocking.mail.tracking.protection.open.extensions')
                            : translate('advanced.blocking.mail.tracking.protection.open.mail')}
                    </Text>
                </Button>
            </div>
        </div>
    );
}

export const ExtensionInstructions = observer(ExtensionInstructionsComponent);
