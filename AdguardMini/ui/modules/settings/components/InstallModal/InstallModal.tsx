// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useSettingsStore } from 'SettingsLib/hooks';
import { SettingsEvent } from 'SettingsStore/modules';
import theme from 'Theme';
import { Modal } from 'UILib';

import { AgnarWithTablet } from '../../assets/Images';

import s from './InstallModal.module.pcss';

/**
 * Props for InstallModal component
 */
type InstallModalProps = {
    onClose(): void;
};

/**
 * Install modal for System-wide Protection settings page
 */
function InstallModalComponent({ onClose }: InstallModalProps) {
    const { advancedBlocking, telemetry } = useSettingsStore();

    const onSubmit = () => {
        telemetry.trackEvent(SettingsEvent.InstallURLFilterClick);
        advancedBlocking.updateSystemWideProtection(true);
        onClose();
    };

    return (
        <Modal
            cancelText={translate('cancel')}
            description={translate('advanced.blocking.system.wide.install.modal.desc')}
            headerSlot={<AgnarWithTablet className={s.InstallModal_image} />}
            submitAction={onSubmit}
            submitClassName={cx(theme.button.greenSubmit, s.InstallModal_submit)}
            submitText={translate('advanced.blocking.system.wide.install.modal.submit')}
            title={translate('advanced.blocking.system.wide.install.modal.title')}
            cancel
            submit
            onClose={onClose}
        />
    );
}

export const InstallModal = observer(InstallModalComponent);
