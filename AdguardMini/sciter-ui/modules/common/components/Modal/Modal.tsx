// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEnter, useEscape } from '@adg/sciter-utils-kit';

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
    size?: 'small' | 'medium' | 'large';
    cancel?: boolean;
    cancelText?: string;
    cancelAction?(): void;
    submitDisabled?: boolean;
    submitClassName?: string;
    contentPadding?: boolean;
    modalForceHeight?: number;
    childrenClassName?: string;
    testId?: string;
    testIdSubmit?: string;
    testIdCancel?: string;
    testIdSecondary?: string;
    testIdClose?: string;
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
    size = 'medium',
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
    testId,
    testIdSubmit,
    testIdCancel,
    testIdSecondary,
    testIdClose,
}: ModalProps) {
    const escapeAction = cancelAction ?? onClose;
    useEscape(escapeAction, escapeAction ? [escapeAction] : [], true);

    const enterAction = submitAction ?? emptyAction;
    useEnter(enterAction, enterAction ? [enterAction] : [], true);

    return (
        <div id={testId} className={cx(s.Modal, s[`Modal__${size}`])} style={{ zIndex: zIndex ? `var(--zi-${zIndex})` : undefined, height: modalForceHeight ? `${modalForceHeight}px` : undefined }}>
            <div
                className={cx(
                    s.Modal_modalContent,
                    contentPadding && s.Modal_modalContent__horizontalPadding,
                )}
                style={{ height: modalForceHeight ? `${modalForceHeight}px` : undefined }}
            >
                {canClose && (<Button testId={testIdClose} className={s.Modal_modalClose} icon="cross" iconClassName={theme.button.grayIcon} type="icon" onClick={onClose} />)}
                <div className={s.Modal_header}>
                    {headerSlot}
                    {title && <Text type="h4">{title}</Text>}
                    {loaderText && (
                        <div className={s.Modal_descWrapper}>
                            <Loader className={s.Modal_loader} />
                            <Text className={s.Modal_loaderText} type="t1">{loaderText}</Text>
                        </div>
                    )}
                    {description && (<Text className={s.Modal_desc} type="t1">{description}</Text>)}
                </div>
                {children && (
                    <div className={cx(s.Modal_children, childrenClassName)}>
                        {children}
                    </div>
                )}
                {(submit || secondary || cancel) && (
                    <div className={s.Modal_buttons}>
                        {submit && (
                            <Button
                                testId={testIdSubmit}
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
                                testId={testIdSecondary}
                                className={s.Modal_button}
                                type="outlined"
                                onClick={secondaryAction}
                            >
                                <Text lineHeight="none" type="t1">{secondaryText}</Text>
                            </Button>
                        )}
                        {cancel && (
                            <Button
                                testId={testIdCancel}
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
            <div
                className={cx(s.Modal_modalBackdrop)}
                onClick={canClose ? onClose : undefined}
            />
        </div>
    );
}
