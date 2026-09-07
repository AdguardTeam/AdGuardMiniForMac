// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useId, useRef } from 'preact/hooks';

import { useFocusOnMount } from 'Common/hooks/useFocusOnMount';
import { useFocusTrap } from 'Common/hooks/useFocusTrap';
import { Text } from 'UILib';

import { ActionButton } from './ActionButton';
import s from './Template.module.pcss';

import type { ActionButtonProps } from './ActionButton';
import type { ComponentChild } from 'preact';

export type TemplateProps = {
    center?: boolean;
    image: string;
    imageBig?: boolean;
    isPng?: boolean;
    headerSlot?: ComponentChild;
    title: string;
    description: ComponentChild;
    buttons: [Nullable<ActionButtonProps>, Nullable<ActionButtonProps>?];
    containerClassName?: string;
    /**
     * Renders the template as a modal dialog and moves focus to its title on
     * mount. Set by the settings overlay, which covers the whole window; the
     * onboarding steps use the same template as an ordinary page and leave it
     * off.
     */
    asDialog?: boolean;
};

/**
 * Template component for EnableExtensions views
 */
export function Template({
    image,
    imageBig,
    isPng,
    headerSlot,
    title,
    description,
    buttons,
    center,
    containerClassName,
    asDialog,
}: TemplateProps) {
    const titleId = useId();
    const descId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);

    useFocusTrap(dialogRef, asDialog);

    // Focused whether this is a page or a dialog. As a dialog it matters most:
    // the overlay can appear while the window is in the background (extensions
    // switched off elsewhere), and parking focus here means the user returns
    // into the dialog rather than into a screen sitting unreachable behind it.
    useFocusOnMount(titleId);

    return (
        <div
            ref={dialogRef}
            aria-describedby={asDialog ? descId : undefined}
            aria-labelledby={asDialog ? titleId : undefined}
            aria-modal={asDialog}
            className={cx(s.Template_container, containerClassName)}
            role={asDialog ? 'dialog' : undefined}
        >
            {headerSlot || <div className={cx(s.Template_gap, center && s.Template_gap__center)} />}
            <div className={imageBig ? s.Template_imgBig : s.Template_img} aria-hidden>
                <img alt="" className={isPng ? s.Template_img_png : s.Template_img_source} src={image} />
            </div>
            <div className={s.Template_content}>
                {/*
                  * As a page, the heading names itself together with the
                  * description below it (see `Start`). As a dialog it stays a
                  * plain heading: the dialog already announces the same pair
                  * through its own `aria-labelledby`/`aria-describedby`.
                  */}
                <Text
                    ariaLabelledby={asDialog ? undefined : `${titleId} ${descId}`}
                    className={s.Template_content_title}
                    id={titleId}
                    tabIndex={asDialog ? -1 : 0}
                    type="h4"
                >
                    {title}
                </Text>
                <Text className={s.Template_content_desc} id={descId} type="t1">{description}</Text>
            </div>
            <div className={s.Template_buttons}>
                {buttons.map((props) => (
                    props && <ActionButton key={props.label} {...props} />
                ))}
            </div>
        </div>
    );
}
