// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useSettingsStore } from 'SettingsLib/hooks';
import theme from 'Theme';
import { Modal } from 'UILib';

import s from './ResetCacheModal.module.pcss';

/**
 * Props for ResetCacheModal component
 */
type ResetCacheModalProps = {
    setShowResetCacheModal(value: boolean): void;
};

/**
 * Reset cache modal for System-wide Protection settings page
 */
function ResetCacheModalComponent({ setShowResetCacheModal }: ResetCacheModalProps) {
    const { advancedBlocking } = useSettingsStore();

    const onSubmit = () => {
        advancedBlocking.resetURLFilterCache();
        setShowResetCacheModal(false);
    };

    const onClose = () => setShowResetCacheModal(false);

    return (
        <Modal
            description={translate('advanced.blocking.system.wide.reset.cache.modal.desc')}
            submitAction={onSubmit}
            submitClassName={cx(theme.button.greenSubmit, s.ResetCacheModal_submit)}
            submitText={translate('reset')}
            title={translate('advanced.blocking.system.wide.reset.cache.modal.title')}
            submit
            onClose={onClose}
        />
    );
}

export const ResetCacheModal = observer(ResetCacheModalComponent);
