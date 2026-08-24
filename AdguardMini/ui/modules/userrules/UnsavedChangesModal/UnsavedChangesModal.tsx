// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { CloseIcon } from './CloseIcon';
import s from './UnsavedChangesModal.module.pcss';

type UnsavedChangesModalProps = {
    onCloseModal(): void;
    onSaveChanges(): void;
    onDiscardChanges(): void;
};

/**
 * Unsaved changes modal
 */
export function UnsavedChangesModal({ onCloseModal, onSaveChanges, onDiscardChanges }: UnsavedChangesModalProps) {
    return (
        <>
            <div className={s.UnsavedChangesModal_background} />
            <div className={s.UnsavedChangesModal_modal}>
                <CloseIcon onClick={onCloseModal} />
                <p className={s.UnsavedChangesModal_modal_title}>
                    {translate('user.rules.editor.modal.unsaved.changes.title')}
                </p>
                <p className={s.UnsavedChangesModal_modal_subtitle}>
                    {translate('user.rules.editor.modal.unsaved.changes.desc')}
                </p>
                <div className={s.UnsavedChangesModal_modal_buttons}>
                    <button
                        className={cx(
                            s.UnsavedChangesModal_modal_buttons_btn,
                            s.UnsavedChangesModal_modal_buttons_btn__primaryBtn,
                        )}
                        type="button"
                        onClick={onSaveChanges}
                    >
                        {translate('user.rules.editor.modal.unsaved.changes.save_and_close')}
                    </button>
                    <button
                        className={cx(
                            s.UnsavedChangesModal_modal_buttons_btn,
                            s.UnsavedChangesModal_modal_buttons_btn__secondaryBtn,
                        )}
                        type="button"
                        onClick={onDiscardChanges}
                    >
                        {translate('user.rules.editor.modal.unsaved.changes.discard_changes')}
                    </button>
                </div>
            </div>
        </>
    );
}
