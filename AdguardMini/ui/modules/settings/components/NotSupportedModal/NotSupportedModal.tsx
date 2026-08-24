// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { getTdsLink, TDS_PARAMS } from 'Common/utils/links';
import theme from 'Theme';
import { ExternalLink, Modal } from 'UILib';

import s from './NotSupportedModal.module.pcss';

/**
 * Props for NotSupportedModal component
 */
type NotSupportedModalProps = {
    setShowNotSupportedModal(value: boolean): void;
};

/**
 * Not supported modal for System-wide Protection settings page
 */
export function NotSupportedModal({ setShowNotSupportedModal }: NotSupportedModalProps) {
    const descParams = {
        link: (text: string) => (
            <ExternalLink
                className={s.NotSupportedModal_descLink}
                color="inheritColor"
                href={getTdsLink(TDS_PARAMS.system_wide_protection)}
                textType="t1"
            >
                {text}
            </ExternalLink>
        ),
    };

    const onClose = () => setShowNotSupportedModal(false);

    return (
        <Modal
            description={translate('advanced.blocking.system.wide.not.supported.modal.desc', descParams)}
            submitAction={onClose}
            submitClassName={cx(theme.button.greenSubmit, s.NotSupportedModal_submit)}
            submitText={translate('close')}
            title={translate('advanced.blocking.system.wide.not.supported.modal.title')}
            submit
            onClose={onClose}
        />
    );
}
