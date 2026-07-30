// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useSettingsStore } from 'SettingsLib/hooks';
import { Modal } from 'UILib';
import theme from 'Theme';

import s from './RemoveFilterModal.module.pcss';

/**
 * Props for RemoveFilterModal component
 */
type RemoveFilterModalProps = {
    setShowRemoveFilterModal: (value: boolean) => void;
};

/**
 * Remove URL filter modal for System-wide Protection settings page
 */
function RemoveFilterModalComponent({ setShowRemoveFilterModal }: RemoveFilterModalProps) {
    const { advancedBlocking } = useSettingsStore();

    const onSubmit = () => {
        advancedBlocking.removeURLFilter();
        setShowRemoveFilterModal(false);
    };

    const onClose = () => setShowRemoveFilterModal(false);

    return (
        <Modal
            title={translate('advanced.blocking.system.wide.remove.filter.modal.title')}
            description={translate('advanced.blocking.system.wide.remove.filter.modal.desc')}
            submit
            submitText={translate('remove')}
            submitAction={onSubmit}
            submitClassName={cx(theme.button.redSubmit, s.RemoveFilterModal_submit)}
            onClose={onClose}
            size="large"
        />
    )
}

export const RemoveFilterModal = observer(RemoveFilterModalComponent);
