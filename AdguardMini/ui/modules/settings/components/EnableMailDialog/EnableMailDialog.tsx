// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { getTdsLink, TDS_PARAMS } from 'Common/utils/links';
import { useSettingsStore } from 'SettingsLib/hooks';
import { RouteName, SettingsEvent } from 'SettingsStore/modules';
import theme from 'Theme';
import { ExternalLink, Modal, Text } from 'UILib';

import mailProtectionIllustration from './images/mailProtectionIllustration.svg';
import s from './EnableMailDialog.module.pcss';

/**
 * Props for EnableMailDialog component
 */
type Props = {
    onClose(): void;
};

/**
 * One-time dialog that explains how to enable the AdGuard extension in
 * Apple Mail.
 */
function EnableMailDialogComponent({ onClose }: Props) {
    const { advancedBlocking, telemetry } = useSettingsStore();

    const openMail = () => {
        telemetry.trackEvent(SettingsEvent.MailProtectionOpenMailClick);
        // The dialog stays open: the app cannot detect when Mail enables the extension.
        advancedBlocking.openAppleMail();
    };

    return (
        <Modal
            description={translate('advanced.blocking.mail.tracking.protection.enable.dialog.desc')}
            headerSlot={(
                <img
                    alt=""
                    className={s.EnableMailDialog_image}
                    src={mailProtectionIllustration}
                />
            )}
            submitAction={openMail}
            submitClassName={theme.button.greenSubmit}
            submitText={translate('advanced.blocking.mail.tracking.protection.open.mail')}
            title={translate('advanced.blocking.mail.tracking.protection.enable.dialog.title')}
            submit
            onClose={onClose}
        >
            <ol className={s.EnableMailDialog_list}>
                <li>
                    <Text type="t1">
                        {translate('advanced.blocking.mail.tracking.protection.extension.step.settings')}
                    </Text>
                </li>
                <li>
                    <Text type="t1">
                        {translate('advanced.blocking.mail.tracking.protection.extension.step.extensions.plain')}
                    </Text>
                </li>
                <li>
                    <Text type="t1">
                        {translate('advanced.blocking.mail.tracking.protection.extension.step.enable.plain')}
                    </Text>
                </li>
            </ol>
            <Text className={s.EnableMailDialog_privacy} type="t1">
                {translate('advanced.blocking.mail.tracking.protection.enable.dialog.privacy', {
                    a: (text: string) => (
                        <ExternalLink href={getTdsLink(TDS_PARAMS.privacy, RouteName.mail_protection)} textType="t1">
                            {text}
                        </ExternalLink>
                    ),
                })}
            </Text>
        </Modal>
    );
}

export const EnableMailDialog = observer(EnableMailDialogComponent);
