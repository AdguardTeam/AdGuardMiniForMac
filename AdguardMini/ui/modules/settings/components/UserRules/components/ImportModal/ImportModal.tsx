// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useSettingsStore } from 'SettingsLib/hooks';
import theme from 'Theme';
import { Checkbox, Modal, Text } from 'UILib';

import s from './ImportModal.module.pcss';

export type ImportModalProps = {
    setShowImportModal(showImportModal: boolean): void;
    onImportRules(): void;
};

/**
 * Import modal for user rules page
 */
function ImportModalComponent({ setShowImportModal, onImportRules }: ImportModalProps) {
    const { userRules } = useSettingsStore();
    const { dontAskAgainImportModal } = userRules;

    const onModalClose = () => {
        setShowImportModal(false);
        userRules.setDontAskAgainImportModal(false);
    };

    const onModalSubmit = () => {
        setShowImportModal(false);
        onImportRules();
    };

    return (
        <Modal
            cancelText={translate('user.rules.import.modal.cancel')}
            description={translate('user.rules.import.modal.desc')}
            submitAction={onModalSubmit}
            submitClassName={theme.button.greenSubmit}
            submitText={translate('user.rules.import.modal.ok')}
            title={translate('user.rules.import.modal.title')}
            cancel
            submit
            onClose={onModalClose}
        >
            <div className={s.ImportModal_content}>
                <Checkbox
                    checked={dontAskAgainImportModal}
                    className={s.ImportModal_checkbox}
                    onChange={() => userRules.setDontAskAgainImportModal(!dontAskAgainImportModal)}
                >
                    <Text type="t1">
                        {translate('user.rules.import.modal.dontAskAgain')}
                    </Text>
                </Checkbox>
            </div>
        </Modal>
    );
}

export const ImportModal = observer(ImportModalComponent);
