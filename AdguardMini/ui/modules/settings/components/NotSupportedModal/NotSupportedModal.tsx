// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { getTdsLink, TDS_PARAMS } from 'Common/utils/links';
import theme from 'Theme';
import { ExternalLink, Modal } from 'UILib';

import s from './NotSupportedModal.module.pcss';

/**
 * Why System-wide Protection is unavailable.
 */
export type NotSupportedModalReason = 'account' | 'macosVersion';

/**
 * Props for NotSupportedModal component
 */
type NotSupportedModalProps = {
    reason: NotSupportedModalReason;
    setShowNotSupportedModal(value: boolean): void;
};

/**
 * Not supported modal for System-wide Protection settings page
 */
export function NotSupportedModal({ reason, setShowNotSupportedModal }: NotSupportedModalProps) {
    const isMacOSVersionReason = reason === 'macosVersion';

    const descParams = {
        link: (text: string) => (
            <ExternalLink
                href={getTdsLink(TDS_PARAMS.system_wide_protection)}
                textType="t1"
            >
                {text}
            </ExternalLink>
        ),
    };

    const onClose = () => setShowNotSupportedModal(false);

    const title = isMacOSVersionReason
        ? translate('advanced.blocking.system.wide.macos.27.2.modal.title')
        : translate('advanced.blocking.system.wide.not.supported.modal.title');
    const description = isMacOSVersionReason
        ? translate('advanced.blocking.system.wide.macos.27.2.modal.desc')
        : translate('advanced.blocking.system.wide.not.supported.modal.desc', descParams);

    return (
        <Modal
            description={description}
            submitAction={onClose}
            submitClassName={cx(theme.button.greenSubmit, s.NotSupportedModal_submit)}
            submitText={translate('close')}
            title={title}
            submit
            onClose={onClose}
        />
    );
}
