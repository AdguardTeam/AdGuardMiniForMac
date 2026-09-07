// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEnter, useEscape } from '@adg/webview-utils-kit';
import { useEffect, useId, useRef } from 'preact/hooks';

import { useFocusTrap } from 'Common/hooks/useFocusTrap';
import theme from 'Theme';
import { Button, Loader, Text } from 'UILib';

import s from './Modal.module.pcss';

import type { ComponentChild, ComponentChildren } from 'preact';

type BasicProps = {
    headerSlot?: ComponentChild;
    title?: string;
    onClose?(): void;
    canClose?: boolean;
    description?: string;
    loaderText?: string;
    children?: ComponentChildren;
    zIndex?: 'below' | 'default' | 'above' | 'above-extra' | 'modal-background' | 'modal' | 'tooltip' | 'paywall' | 'paywall-modal';
    cancel?: boolean;
    cancelText?: string;
    cancelAction?(): void;
    submitDisabled?: boolean;
    submitClassName?: string;
    contentPadding?: boolean;
    modalForceHeight?: number;
    childrenClassName?: string;
    /**
     * Announces the whole body on open, for modals whose text lives in
     * `children` rather than in `description` — otherwise only the title is
     * read and the content has to be hunted for.
     *
     * Opt-in: on a modal whose body is a form this would read every field's
     * text as one blob before the user reaches any of them.
     */
    describedByChildren?: boolean;
};

export type ModalProps = BasicProps & ({
    submit?: false;
    submitText?: string;
    submitAction?(): void;
} | {
    submit: true;
    submitText: string;
    submitAction(): void;
}) & ({
    secondary?: false;
    secondaryText?: string;
    secondaryAction?(): void;
} | {
    secondary: true;
    secondaryText: string;
    secondaryAction(): void;
});

const emptyAction = () => {};

/**
 * Modal component
 */
export function Modal({
    headerSlot,
    title,
    description,
    children,
    zIndex,
    submit,
    submitText,
    submitAction,
    submitDisabled,
    submitClassName,
    secondary,
    secondaryAction,
    secondaryText,
    cancel,
    cancelText,
    onClose = () => {},
    cancelAction,
    canClose = true,
    loaderText,
    contentPadding = true,
    modalForceHeight,
    childrenClassName,
    describedByChildren,
}: ModalProps) {
    const escapeAction = cancelAction ?? onClose;
    useEscape(escapeAction, escapeAction ? [escapeAction] : [], true);

    const enterAction = submitAction ?? emptyAction;
    useEnter(enterAction, enterAction ? [enterAction] : [], true);

    const titleId = useId();
    const descriptionId = useId();
    const childrenId = useId();

    // A dialog may describe itself with a `description`, with its body, or
    // both; `aria-describedby` takes a list and reads them in order.
    const describedBy = [
        description ? descriptionId : undefined,
        describedByChildren && children ? childrenId : undefined,
    ].filter(Boolean).join(' ') || undefined;
    const dialogRef = useRef<HTMLDivElement>(null);

    useFocusTrap(dialogRef);

    // A modal appears without touching focus, so VoiceOver stays wherever it
    // was and never announces that a dialog opened. Move focus to the title
    // (or the dialog itself when there is none) so it is read on arrival.
    //
    // Skipped when focus already landed inside: child effects run before the
    // parent's, so a field with `autoFocus` has claimed it by now and must
    // keep it.
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog || dialog.contains(document.activeElement)) {
            return;
        }
        (document.getElementById(titleId) ?? dialog).focus();
    }, [titleId]);

    return (
        <div className={cx(s.Modal)} style={{ zIndex: zIndex ? `var(--zi-${zIndex})` : undefined }}>
            {/*
              * `role="dialog"` + `aria-modal` tell VoiceOver a dialog opened
              * and confine its cursor to it — without them the cursor keeps
              * wandering the page under the backdrop. The name comes from the
              * title element (falling back to the loader caption), and
              * `aria-describedby` makes VO read the description on entry.
              */}
            <div
                ref={dialogRef}
                aria-describedby={describedBy}
                aria-label={!title ? loaderText : undefined}
                aria-labelledby={title ? titleId : undefined}
                className={cx(
                    s.Modal_modalContent,
                    contentPadding && s.Modal_modalContent__horizontalPadding,
                )}
                role="dialog"
                style={{ height: modalForceHeight ? `${modalForceHeight}px` : undefined }}
                tabIndex={-1}
                aria-modal
            >
                {canClose && (<Button ariaLabel={translate('close')} className={s.Modal_modalClose} icon="cross" iconClassName={theme.button.grayIcon} type="icon" onClick={onClose} />)}
                <div className={s.Modal_header}>
                    {headerSlot}
                    {title && <Text id={titleId} tabIndex={-1} type="h4">{title}</Text>}
                    {loaderText && (
                        <div className={s.Modal_descWrapper}>
                            <Loader className={s.Modal_loader} />
                            <Text className={s.Modal_loaderText} type="t1">{loaderText}</Text>
                        </div>
                    )}
                    {description && (<Text className={s.Modal_desc} id={descriptionId} type="t1">{description}</Text>)}
                </div>
                {children && (
                    <div className={cx(s.Modal_children, childrenClassName)} id={childrenId}>
                        {children}
                    </div>
                )}
                {(submit || secondary || cancel) && (
                    <div className={s.Modal_buttons}>
                        {submit && (
                            <Button
                                className={cx(s.Modal_button, submitClassName)}
                                disabled={submitDisabled}
                                type="submit"
                                onClick={submitAction}
                            >
                                <Text lineHeight="none" type="t1">{submitText}</Text>
                            </Button>
                        )}
                        {secondary && (
                            <Button
                                className={s.Modal_button}
                                type="outlined"
                                onClick={secondaryAction}
                            >
                                <Text lineHeight="none" type="t1">{secondaryText}</Text>
                            </Button>
                        )}
                        {cancel && (
                            <Button
                                className={s.Modal_button}
                                type="outlined"
                                onClick={cancelAction ?? onClose}
                            >
                                <Text lineHeight="none" type="t1">{cancelText ?? translate('cancel')}</Text>
                            </Button>
                        )}
                    </div>
                )}
            </div>
            {/*
              * The backdrop is a nameless clickable area; hiding it from the
              * accessibility tree keeps the VoiceOver cursor off it. Closing
              * stays available through the Close button and Escape.
              */}
            <div
                className={cx(s.Modal_modalBackdrop)}
                aria-hidden
                onClick={canClose ? onClose : undefined}
            />
        </div>
    );
}
