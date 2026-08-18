// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useSettingsStore } from 'SettingsLib/hooks';
import { SettingsEvent } from 'Modules/settings/store/modules';
import { Modal } from 'UILib';
import theme from 'Theme';

import { AgnarWithTablet } from '../../../../assets/Images';
import s from './InstallModal.module.pcss';

import type { URLFilterConfiguration } from 'Apis/types';

/**
 * Props for InstallModal component
 */
type InstallModalProps = {
    configuration: URLFilterConfiguration;
    onClose: () => void;
};

/**
 * Install modal for System-wide Protection settings page
 */
function InstallModalComponent({ configuration, onClose }: InstallModalProps) {
    const { advancedBlocking, telemetry } = useSettingsStore();

    const onSubmit = () => {
        telemetry.trackEvent(SettingsEvent.InstallURLFilterClick);
        advancedBlocking.installSystemWideProtection(configuration);
        onClose();
    };

    return (
        <Modal
            headerSlot={<AgnarWithTablet className={s.InstallModal_image} />}
            title={translate('advanced.blocking.system.wide.install.modal.title')}
            description={translate('advanced.blocking.system.wide.install.modal.desc')}
            submit
            submitText={translate('advanced.blocking.system.wide.install.modal.submit')}
            submitAction={onSubmit}
            submitClassName={cx(theme.button.greenSubmit, s.InstallModal_submit)}
            cancel
            cancelText={translate('cancel')}
            onClose={onClose}
            size="large"
        />
    )
}

export const InstallModal = observer(InstallModalComponent);
