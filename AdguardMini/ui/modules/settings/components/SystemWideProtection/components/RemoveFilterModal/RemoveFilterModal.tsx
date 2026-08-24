// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useSettingsStore } from 'SettingsLib/hooks';
import { SettingsEvent } from 'SettingsStore/modules';
import theme from 'Theme';
import { Modal } from 'UILib';

import s from './RemoveFilterModal.module.pcss';

/**
 * Props for RemoveFilterModal component
 */
type RemoveFilterModalProps = {
    setShowRemoveFilterModal(value: boolean): void;
};

/**
 * Remove URL filter modal for System-wide Protection settings page
 */
function RemoveFilterModalComponent({ setShowRemoveFilterModal }: RemoveFilterModalProps) {
    const { advancedBlocking, telemetry } = useSettingsStore();

    const onSubmit = () => {
        telemetry.trackEvent(SettingsEvent.RemoveURLFilterClick);
        advancedBlocking.removeURLFilter();
        setShowRemoveFilterModal(false);
    };

    const onClose = () => setShowRemoveFilterModal(false);

    return (
        <Modal
            description={translate('advanced.blocking.system.wide.remove.filter.modal.desc')}
            submitAction={onSubmit}
            submitClassName={cx(theme.button.redSubmit, s.RemoveFilterModal_submit)}
            submitText={translate('remove')}
            title={translate('advanced.blocking.system.wide.remove.filter.modal.title')}
            submit
            onClose={onClose}
        />
    );
}

export const RemoveFilterModal = observer(RemoveFilterModalComponent);
