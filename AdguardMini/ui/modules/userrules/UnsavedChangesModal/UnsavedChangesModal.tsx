// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useId, useRef } from 'preact/hooks';

import { useFocusOnMount } from 'Common/hooks/useFocusOnMount';
import { useFocusTrap } from 'Common/hooks/useFocusTrap';

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
    const titleId = useId();
    const descriptionId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);

    useFocusTrap(dialogRef);

    // This modal is hand-rolled rather than built on the shared `Modal`, so it
    // needs the same treatment on its own: focus lands on the title, which is
    // what makes VoiceOver announce that the dialog opened.
    useFocusOnMount(titleId);

    return (
        <>
            {/* Nameless click-to-nowhere layer — kept out of the a11y tree. */}
            <div className={s.UnsavedChangesModal_background} aria-hidden />
            <div
                ref={dialogRef}
                aria-describedby={descriptionId}
                aria-labelledby={titleId}
                className={s.UnsavedChangesModal_modal}
                role="dialog"
                aria-modal
            >
                <CloseIcon ariaLabel={translate('close')} onClick={onCloseModal} />
                <p className={s.UnsavedChangesModal_modal_title} id={titleId} tabIndex={-1}>
                    {translate('user.rules.editor.modal.unsaved.changes.title')}
                </p>
                <p className={s.UnsavedChangesModal_modal_subtitle} id={descriptionId}>
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
