// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { getTdsLink, TDS_PARAMS } from 'Common/utils/links';
import { ExternalLink, Modal } from 'UILib';
import theme from 'Theme';

import s from './NotSupportedModal.module.pcss';

/**
 * Props for NotSupportedModal component
 */
type NotSupportedModalProps = {
    setShowNotSupportedModal: (value: boolean) => void;
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
            title={translate('advanced.blocking.system.wide.not.supported.modal.title')}
            description={translate('advanced.blocking.system.wide.not.supported.modal.desc', descParams)}
            submit
            submitText={translate('close')}
            submitAction={onClose}
            submitClassName={cx(theme.button.greenSubmit, s.NotSupportedModal_submit)}
            onClose={onClose}
            size="large"
        />
    );
}
