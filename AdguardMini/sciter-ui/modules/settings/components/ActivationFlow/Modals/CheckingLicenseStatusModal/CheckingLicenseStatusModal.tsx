// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import theme from 'Theme';
import { Modal } from 'UILib';

import s from './CheckingLicenseStatusModal.module.pcss';
import { AgnarWithTablet } from '../../../../assets/Images';

type CheckingLicenseStatusModalProps = {
    onClose(): void;
};

/**
 * "Checking license status" modal for activation flow
 */
export function CheckingLicenseStatusModal({
    onClose,
}: CheckingLicenseStatusModalProps) {
    return (
        <Modal
            headerSlot={<AgnarWithTablet className={s.CheckingLicenseStatusModal_image} />}
            size="medium"
            submitAction={onClose}
            submitClassName={theme.button.greenSubmit}
            submitText={translate('cancel')}
            title={translate('settings.activation.flow.checking.license.status')}
            zIndex="paywall-modal"
            submit
            onClose={onClose}
        />
    );
}
